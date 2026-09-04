import "server-only";

import { and, asc, eq } from "drizzle-orm";

import {
  canTransitionDocumentStatus,
  canTransitionEvidenceRequirement,
  documentStatuses,
  isEvidenceRequirementStatus,
  type DocumentStatus,
} from "@/config/evidence";
import {
  DOWNLOAD_URL_EXPIRY_SECONDS,
  UPLOAD_URL_EXPIRY_SECONDS,
} from "@/config/evidence";
import { getClaimForClient } from "@/lib/claims/repository";
import { getDb } from "@/lib/db";
import {
  claimDocumentUploads,
  claimDocuments,
  claimEvidenceRequirements,
} from "@/lib/db/schema/evidence";
import { claimTimelineEvents, claims } from "@/lib/db/schema/claims";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { emailOutbox } from "@/lib/db/schema/communications";
import { buildEmailOutboxValues } from "@/lib/communications/email";
import {
  createOpaqueDocumentReference,
  createOpaqueStorageKey,
  getPrivateObjectStorage,
} from "./storage";
import { isR2Configured } from "./r2";
import {
  detectDocumentMimeType,
  DocumentValidationError,
  isDocumentRequirementUploadable,
  validateUploadRequest,
} from "./validation";
import { createClaimNotificationInTransaction } from "@/lib/notifications/repository";
import { updateEvidenceRequirementStatusInTransaction } from "@/lib/evidence/repository";
import { emitStaffCommunicationInTransaction } from "@/lib/communications/staff-notifications";

type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<DbClient["transaction"]>[0] extends (
  tx: infer T,
  ...args: never[]
) => unknown
  ? T
  : never;
export type DocumentDbExecutor = DbClient | DbTransaction;

export type DocumentServiceErrorCode =
  | "CLAIM_NOT_FOUND"
  | "CLAIM_ARCHIVED"
  | "UPLOAD_NOT_FOUND"
  | "UPLOAD_EXPIRED"
  | "UPLOAD_IN_PROGRESS"
  | "UPLOAD_ALREADY_FINALIZED"
  | "STORAGE_NOT_CONFIGURED"
  | "STORAGE_UNAVAILABLE"
  | "INVALID_UPLOAD"
  | "DOCUMENT_NOT_AVAILABLE";

export class DocumentServiceError extends Error {
  constructor(
    public readonly code: DocumentServiceErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "DocumentServiceError";
  }
}

export function isDocumentReviewAvailable() {
  return isR2Configured();
}

export async function transitionDocumentStatusInTransaction(
  executor: DocumentDbExecutor,
  claimId: string,
  documentReference: string,
  requestedStatus: string,
) {
  if (!isDocumentStatus(requestedStatus))
    throw new DocumentServiceError(
      "INVALID_UPLOAD",
      400,
      "This document review action is not available.",
    );
  const current = (
    await executor
      .select()
      .from(claimDocuments)
      .where(
        and(
          eq(claimDocuments.claimId, claimId),
          eq(claimDocuments.documentReference, documentReference),
        ),
      )
      .limit(1)
  )[0];
  if (!current)
    throw new DocumentServiceError(
      "DOCUMENT_NOT_AVAILABLE",
      404,
      "Document not found.",
    );
  if (!canTransitionDocumentStatus(current.status, requestedStatus))
    throw new DocumentServiceError(
      "INVALID_UPLOAD",
      409,
      "This document review transition is no longer available.",
    );
  if (
    ["UNDER_REVIEW", "ACCEPTED", "REPLACEMENT_REQUESTED", "REJECTED"].includes(
      requestedStatus,
    )
  ) {
    if (
      !isDocumentReviewAvailable() ||
      current.securityStatus !== "VALIDATED" ||
      !current.storageKey
    )
      throw new DocumentServiceError(
        "DOCUMENT_NOT_AVAILABLE",
        503,
        "Binary document access is not configured for this environment.",
      );
  }
  if (
    requestedStatus === "REPLACEMENT_REQUESTED" &&
    current.evidenceRequirementId
  ) {
    const requirement = (
      await executor
        .select({ status: claimEvidenceRequirements.status })
        .from(claimEvidenceRequirements)
        .where(
          and(
            eq(claimEvidenceRequirements.id, current.evidenceRequirementId),
            eq(claimEvidenceRequirements.claimId, claimId),
          ),
        )
        .limit(1)
    )[0];
    if (
      !requirement ||
      !isEvidenceRequirementStatus(requirement.status) ||
      !canTransitionEvidenceRequirement(
        requirement.status,
        "MORE_INFORMATION_REQUIRED",
      )
    )
      throw new DocumentServiceError(
        "INVALID_UPLOAD",
        409,
        "The linked evidence request cannot accept replacement guidance.",
      );
  }
  const now = new Date();
  const updated = (
    await executor
      .update(claimDocuments)
      .set({ status: requestedStatus, updatedAt: now })
      .where(
        and(
          eq(claimDocuments.id, current.id),
          eq(claimDocuments.status, current.status),
        ),
      )
      .returning()
  )[0];
  if (!updated)
    throw new DocumentServiceError(
      "UPLOAD_IN_PROGRESS",
      409,
      "This document changed before the review action completed.",
    );
  const evidenceChange =
    requestedStatus === "REPLACEMENT_REQUESTED" && current.evidenceRequirementId
      ? await updateEvidenceRequirementStatusInTransaction(
          executor,
          claimId,
          current.evidenceRequirementId,
          "MORE_INFORMATION_REQUIRED",
        )
      : null;
  if (requestedStatus === "ACCEPTED")
    await executor.insert(claimTimelineEvents).values({
      claimId,
      eventType: "DOCUMENT_ACCEPTED",
      title: "Document accepted for the case record",
      description:
        "A document has been accepted for the Claims Bridge case record.",
      visibility: "CLIENT",
      occurredAt: now,
      createdAt: now,
    });
  if (
    ["ACCEPTED", "REPLACEMENT_REQUESTED", "REJECTED"].includes(requestedStatus)
  )
    await createClaimNotificationInTransaction(executor, {
      claimId,
      type: "DOCUMENT_REVIEW_UPDATE",
      sourceType: "DOCUMENT_STATUS",
      sourceId: updated.id,
      dedupeKey: `document-review:${updated.id}:${requestedStatus}`,
    });
  if (requestedStatus === "REPLACEMENT_REQUESTED") {
    const claim = (
      await executor
        .select({
          claimReference: claims.claimReference,
          clientReference: clientProfiles.clientReference,
        })
        .from(claims)
        .innerJoin(
          clientProfiles,
          eq(clientProfiles.id, claims.clientProfileId),
        )
        .where(eq(claims.id, claimId))
        .limit(1)
    )[0];
    if (claim)
      await executor
        .insert(emailOutbox)
        .values(
          buildEmailOutboxValues({
            event: "DOCUMENT_ACTION_REQUIRED",
            recipient: {
              mode: "DEFERRED",
              recipientType: "CLIENT",
              recipientReference: claim.clientReference,
            },
            payload: {
              claimReference: claim.claimReference,
              documentReference: current.documentReference ?? "document",
              title: current.displayName,
              reason:
                "Please provide a replacement or clearer copy so we can continue reviewing the requested information.",
            },
            dedupeKey: `DOCUMENT_ACTION:${updated.id}:REPLACEMENT_REQUESTED`,
          }),
        )
        .onConflictDoNothing({ target: emailOutbox.dedupeKey });
  }
  return { previous: current, updated, evidenceChange };
}

export async function transitionDocumentStatus(
  claimId: string,
  documentReference: string,
  requestedStatus: string,
) {
  const db = getDb();
  return (
    await db.transaction((tx) =>
      transitionDocumentStatusInTransaction(
        tx,
        claimId,
        documentReference,
        requestedStatus,
      ),
    )
  ).updated;
}

function isDocumentStatus(value: string): value is DocumentStatus {
  return documentStatuses.includes(value as DocumentStatus);
}

function mapValidationError(error: DocumentValidationError) {
  const messages: Record<DocumentValidationError["code"], string> = {
    UNSUPPORTED_TYPE:
      "Unsupported file type. Please choose a PDF, JPEG or PNG file.",
    FILE_TOO_LARGE: "This file is larger than the 15 MB limit.",
    INVALID_FILENAME: "This filename could not be used.",
    INVALID_CATEGORY: "Choose a valid document category.",
    INVALID_REQUIREMENT:
      "This evidence request is not available for the selected document.",
  };
  return new DocumentServiceError("INVALID_UPLOAD", 400, messages[error.code]);
}

function isStorageConfigurationError(error: unknown) {
  return error instanceof Error && error.name === "StorageNotConfiguredError";
}

function safeStorageError(error: unknown): DocumentServiceError {
  return new DocumentServiceError(
    isStorageConfigurationError(error)
      ? "STORAGE_NOT_CONFIGURED"
      : "STORAGE_UNAVAILABLE",
    503,
    isStorageConfigurationError(error)
      ? "Secure document uploads are not configured yet."
      : "We couldn't connect to secure document storage. Your claim has not been affected.",
  );
}

async function getOwnedClaim(clerkUserId: string, claimReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned)
    throw new DocumentServiceError("CLAIM_NOT_FOUND", 404, "Claim not found.");
  if (owned.claim.archivedAt)
    throw new DocumentServiceError(
      "CLAIM_ARCHIVED",
      409,
      "This archived claim is read-only.",
    );
  return owned;
}

export async function authorizeDocumentUpload(
  clerkUserId: string,
  claimReference: string,
  input: {
    category: string;
    evidenceRequirementType?: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  },
) {
  const owned = await getOwnedClaim(clerkUserId, claimReference);
  let validated;
  try {
    validated = validateUploadRequest(input);
  } catch (error) {
    if (error instanceof DocumentValidationError)
      throw mapValidationError(error);
    throw error;
  }

  const db = getDb();
  let evidenceRequirementId: string | null = null;
  if (validated.evidenceRequirementType) {
    const requirement = (
      await db
        .select({
          id: claimEvidenceRequirements.id,
          status: claimEvidenceRequirements.status,
          clientVisible: claimEvidenceRequirements.clientVisible,
        })
        .from(claimEvidenceRequirements)
        .where(
          and(
            eq(claimEvidenceRequirements.claimId, owned.claim.id),
            eq(
              claimEvidenceRequirements.type,
              validated.evidenceRequirementType,
            ),
            eq(claimEvidenceRequirements.clientVisible, true),
          ),
        )
        .orderBy(asc(claimEvidenceRequirements.createdAt))
        .limit(1)
    )[0];
    if (!requirement || !isDocumentRequirementUploadable(requirement.status))
      throw new DocumentServiceError(
        "INVALID_UPLOAD",
        400,
        "This evidence request is not currently accepting documents.",
      );
    evidenceRequirementId = requirement.id;
  }

  const storageKey = createOpaqueStorageKey();
  const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY_SECONDS * 1000);
  let uploadUrl: string;
  try {
    uploadUrl = await (
      await getPrivateObjectStorage()
    ).createUploadUrl({
      key: storageKey,
      contentType: validated.mimeType,
      expiresInSeconds: UPLOAD_URL_EXPIRY_SECONDS,
    });
  } catch (error) {
    if (error instanceof DocumentServiceError) throw error;
    throw safeStorageError(error);
  }

  const upload = (
    await db
      .insert(claimDocumentUploads)
      .values({
        claimId: owned.claim.id,
        evidenceRequirementId,
        objectKey: storageKey,
        category: validated.category,
        displayName: validated.displayName,
        originalFilename: validated.originalFilename,
        declaredMimeType: validated.mimeType,
        declaredSizeBytes: validated.sizeBytes,
        status: "AUTHORIZED",
        expiresAt,
      })
      .returning({ id: claimDocumentUploads.id })
  )[0];
  return { uploadId: upload.id, uploadUrl, expiresAt };
}

async function rejectUpload(uploadId: string, claimId: string) {
  const db = getDb();
  await db
    .update(claimDocumentUploads)
    .set({ status: "REJECTED" })
    .where(
      and(
        eq(claimDocumentUploads.id, uploadId),
        eq(claimDocumentUploads.claimId, claimId),
        eq(claimDocumentUploads.status, "AUTHORIZED"),
      ),
    );
}

async function deleteObjectSafely(key: string) {
  try {
    await (await getPrivateObjectStorage()).deleteObject(key);
  } catch {
    /* cleanup can be retried by a future maintenance task */
  }
}

function validateStoredObject(input: {
  declaredMimeType: string;
  declaredSizeBytes: number;
  contentLength: number;
  contentType: string | null;
  prefix: Uint8Array;
}) {
  if (
    input.contentLength !== input.declaredSizeBytes ||
    input.contentLength <= 0 ||
    input.contentLength > 15 * 1024 * 1024
  )
    throw new DocumentServiceError(
      "INVALID_UPLOAD",
      400,
      "This document could not be validated.",
    );
  if (
    input.contentType &&
    input.contentType.toLowerCase() !== input.declaredMimeType.toLowerCase()
  )
    throw new DocumentServiceError(
      "INVALID_UPLOAD",
      400,
      "This document could not be validated.",
    );
  if (detectDocumentMimeType(input.prefix) !== input.declaredMimeType)
    throw new DocumentServiceError(
      "INVALID_UPLOAD",
      400,
      "This document could not be validated.",
    );
}

function publicDocument(document: typeof claimDocuments.$inferSelect) {
  return {
    documentReference: document.documentReference,
    displayName: document.displayName,
    category: document.category,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    status: document.status,
    securityStatus: document.securityStatus,
    uploadedAt: document.uploadedAt,
  };
}

export async function finalizeDocumentUpload(
  clerkUserId: string,
  claimReference: string,
  uploadId: string,
) {
  const owned = await getOwnedClaim(clerkUserId, claimReference);
  const db = getDb();
  const upload = (
    await db
      .select()
      .from(claimDocumentUploads)
      .where(
        and(
          eq(claimDocumentUploads.id, uploadId),
          eq(claimDocumentUploads.claimId, owned.claim.id),
        ),
      )
      .limit(1)
  )[0];
  if (!upload)
    throw new DocumentServiceError(
      "UPLOAD_NOT_FOUND",
      404,
      "This upload could not be found.",
    );
  if (upload.status === "FINALIZED" && upload.documentId) {
    const document = (
      await db
        .select()
        .from(claimDocuments)
        .where(eq(claimDocuments.id, upload.documentId))
        .limit(1)
    )[0];
    if (document) return publicDocument(document);
    throw new DocumentServiceError(
      "UPLOAD_ALREADY_FINALIZED",
      409,
      "This upload has already been finalized.",
    );
  }
  if (upload.status === "FINALIZING")
    throw new DocumentServiceError(
      "UPLOAD_IN_PROGRESS",
      409,
      "This upload is already being finalized.",
    );
  if (upload.status !== "AUTHORIZED")
    throw new DocumentServiceError(
      "UPLOAD_ALREADY_FINALIZED",
      409,
      "This upload is no longer available.",
    );
  if (upload.expiresAt.getTime() <= Date.now()) {
    await db
      .update(claimDocumentUploads)
      .set({ status: "EXPIRED" })
      .where(
        and(
          eq(claimDocumentUploads.id, upload.id),
          eq(claimDocumentUploads.status, "AUTHORIZED"),
        ),
      );
    await deleteObjectSafely(upload.objectKey);
    throw new DocumentServiceError(
      "UPLOAD_EXPIRED",
      410,
      "This upload has expired. Please start again.",
    );
  }

  let stored;
  try {
    const storage = await getPrivateObjectStorage();
    const head = await storage.headObject(upload.objectKey);
    const prefix = await storage.getObjectPrefix(upload.objectKey, 16);
    validateStoredObject({
      declaredMimeType: upload.declaredMimeType,
      declaredSizeBytes: upload.declaredSizeBytes,
      contentLength: head.contentLength,
      contentType: head.contentType,
      prefix,
    });
    stored = { head, storage };
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      await rejectUpload(upload.id, owned.claim.id);
      await deleteObjectSafely(upload.objectKey);
      throw error;
    }
    throw safeStorageError(error);
  }

  try {
    const document = await db.transaction(async (tx) => {
      const claimed = (
        await tx
          .update(claimDocumentUploads)
          .set({ status: "FINALIZING" })
          .where(
            and(
              eq(claimDocumentUploads.id, upload.id),
              eq(claimDocumentUploads.status, "AUTHORIZED"),
            ),
          )
          .returning()
      )[0];
      if (!claimed)
        throw new DocumentServiceError(
          "UPLOAD_IN_PROGRESS",
          409,
          "This upload is already being finalized.",
        );
      let requirement;
      if (claimed.evidenceRequirementId) {
        requirement = (
          await tx
            .select()
            .from(claimEvidenceRequirements)
            .where(
              and(
                eq(claimEvidenceRequirements.id, claimed.evidenceRequirementId),
                eq(claimEvidenceRequirements.claimId, owned.claim.id),
              ),
            )
            .limit(1)
        )[0];
        if (
          !requirement ||
          !requirement.clientVisible ||
          !isDocumentRequirementUploadable(requirement.status) ||
          !canTransitionEvidenceRequirement(requirement.status, "UPLOADED")
        )
          throw new DocumentServiceError(
            "INVALID_UPLOAD",
            400,
            "This evidence request is no longer accepting documents.",
          );
      }
      const now = new Date();
      const inserted = (
        await tx
          .insert(claimDocuments)
          .values({
            documentReference: createOpaqueDocumentReference(),
            claimId: owned.claim.id,
            evidenceRequirementId: claimed.evidenceRequirementId,
            category: claimed.category,
            displayName: claimed.displayName,
            originalFilename: claimed.originalFilename,
            storageKey: claimed.objectKey,
            storageProvider: "R2",
            mimeType: claimed.declaredMimeType,
            sizeBytes: stored.head.contentLength,
            checksum: stored.head.checksum,
            securityStatus: "VALIDATED",
            validatedAt: now,
            status: "UPLOADED",
            uploadedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning()
      )[0];
      if (requirement)
        await tx
          .update(claimEvidenceRequirements)
          .set({ status: "UPLOADED", completedAt: null, updatedAt: now })
          .where(
            and(
              eq(claimEvidenceRequirements.id, requirement.id),
              eq(claimEvidenceRequirements.status, requirement.status),
            ),
          );
      await tx.insert(claimTimelineEvents).values({
        claimId: owned.claim.id,
        eventType: "DOCUMENT_RECEIVED",
        title: "Document received",
        description:
          "A document has been received and its file type has been validated.",
        visibility: "CLIENT",
        occurredAt: now,
        createdAt: now,
      });
      await createClaimNotificationInTransaction(tx, {
        claimId: owned.claim.id,
        type: "DOCUMENT_RECEIVED",
        sourceType: "DOCUMENT",
        sourceId: inserted.id,
        dedupeKey: `document-received:${inserted.id}`,
      });
      const profile = (
        await tx
          .select({ clientReference: clientProfiles.clientReference })
          .from(clientProfiles)
          .where(eq(clientProfiles.id, owned.claim.clientProfileId))
          .limit(1)
      )[0];
      if (profile)
        await tx
          .insert(emailOutbox)
          .values(
            buildEmailOutboxValues({
              event: "DOCUMENT_RECEIVED",
              recipient: {
                mode: "DEFERRED",
                recipientType: "CLIENT",
                recipientReference: profile.clientReference,
              },
              payload: {
                claimReference,
                documentReference: inserted.documentReference ?? "document",
                title: inserted.displayName,
              },
              dedupeKey: `DOCUMENT_RECEIVED:${inserted.documentReference}`,
            }),
          )
          .onConflictDoNothing({ target: emailOutbox.dedupeKey });
      const documentReference = inserted.documentReference ?? "document";
      await emitStaffCommunicationInTransaction(tx, {
        event: "EVIDENCE_UPLOADED",
        reference: claimReference,
        summary: `A client uploaded ${inserted.category}. Review the evidence securely in Claims Bridge.`,
        destination: `/admin/claims/${encodeURIComponent(claimReference)}/evidence`,
        dedupeScope: documentReference,
        claimId: owned.claim.id,
      });
      await tx
        .update(claimDocumentUploads)
        .set({ status: "FINALIZED", documentId: inserted.id, finalizedAt: now })
        .where(
          and(
            eq(claimDocumentUploads.id, claimed.id),
            eq(claimDocumentUploads.status, "FINALIZING"),
          ),
        );
      return inserted;
    });
    return publicDocument(document);
  } catch (error) {
    if (error instanceof DocumentServiceError) throw error;
    throw new DocumentServiceError(
      "STORAGE_UNAVAILABLE",
      503,
      "We couldn't complete this upload. Your claim has not been affected.",
    );
  }
}

export async function getDocumentDownloadUrlForClient(
  clerkUserId: string,
  claimReference: string,
  documentReference: string,
) {
  const owned = await getOwnedClaim(clerkUserId, claimReference);
  const db = getDb();
  const document = (
    await db
      .select()
      .from(claimDocuments)
      .where(
        and(
          eq(claimDocuments.claimId, owned.claim.id),
          eq(claimDocuments.documentReference, documentReference),
        ),
      )
      .limit(1)
  )[0];
  if (
    !document ||
    !document.storageKey ||
    document.securityStatus !== "VALIDATED" ||
    document.status === "REJECTED"
  )
    throw new DocumentServiceError(
      "DOCUMENT_NOT_AVAILABLE",
      404,
      "This document is not available.",
    );
  try {
    return await (
      await getPrivateObjectStorage()
    ).createDownloadUrl(document.storageKey, DOWNLOAD_URL_EXPIRY_SECONDS);
  } catch (error) {
    throw safeStorageError(error);
  }
}

export async function expirePendingDocumentUploads(now = new Date()) {
  const db = getDb();
  const pending = await db
    .select()
    .from(claimDocumentUploads)
    .where(eq(claimDocumentUploads.status, "AUTHORIZED"));
  const expired = pending.filter((upload) => upload.expiresAt <= now);
  for (const upload of expired) {
    await db
      .update(claimDocumentUploads)
      .set({ status: "EXPIRED" })
      .where(
        and(
          eq(claimDocumentUploads.id, upload.id),
          eq(claimDocumentUploads.status, "AUTHORIZED"),
        ),
      );
    await deleteObjectSafely(upload.objectKey);
  }
  return expired.length;
}
