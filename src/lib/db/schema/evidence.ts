import { bigint, boolean, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { documentSecurityStatuses, documentStatuses, documentUploadStatuses, evidenceRequirementTypes } from "@/config/evidence";
import { claims } from "./claims";

export const claimEvidenceRequirementType = pgEnum("claim_evidence_requirement_type", evidenceRequirementTypes);
export const claimEvidenceRequirementStatus = pgEnum("claim_evidence_requirement_status", ["REQUESTED", "UPLOADED", "UNDER_REVIEW", "ACCEPTED", "MORE_INFORMATION_REQUIRED", "WAIVED"]);
export const claimEvidenceRequirementPriority = pgEnum("claim_evidence_requirement_priority", ["LOW", "NORMAL", "HIGH"]);
export const claimDocumentCategory = pgEnum("claim_document_category", ["TENANCY_AGREEMENT", "DEPOSIT_PAYMENT", "DEPOSIT_PROTECTION", "PRESCRIBED_INFORMATION", "SCHEME_CORRESPONDENCE", "LANDLORD_CORRESPONDENCE", "LETTING_AGENT_CORRESPONDENCE", "FINANCIAL_RECORD", "IDENTITY", "OTHER_SUPPORTING_EVIDENCE"]);
export const claimDocumentStatus = pgEnum("claim_document_status", documentStatuses);
export const claimDocumentSecurityStatus = pgEnum("claim_document_security_status", documentSecurityStatuses);
export const claimDocumentUploadStatus = pgEnum("claim_document_upload_status", documentUploadStatuses);
export const claimDocumentStorageProvider = pgEnum("claim_document_storage_provider", ["R2"]);

export const claimEvidenceRequirements = pgTable(
  "claim_evidence_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    requirementReference: text("requirement_reference").notNull().unique(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
    type: claimEvidenceRequirementType("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: claimEvidenceRequirementStatus("status").notNull().default("REQUESTED"),
    priority: claimEvidenceRequirementPriority("priority").notNull().default("NORMAL"),
    clientVisible: boolean("client_visible").notNull().default(true),
    required: boolean("required").notNull().default(true),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("claim_evidence_requirements_claim_status_idx").on(table.claimId, table.status),
    index("claim_evidence_requirements_claim_visible_idx").on(table.claimId, table.clientVisible),
  ],
);

export const claimDocuments = pgTable(
  "claim_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
    evidenceRequirementId: uuid("evidence_requirement_id").references(() => claimEvidenceRequirements.id, { onDelete: "set null" }),
    documentReference: text("document_reference").unique(),
    category: claimDocumentCategory("category").notNull(),
    displayName: text("display_name").notNull(),
    originalFilename: text("original_filename"),
    storageKey: text("storage_key"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    checksum: text("checksum"),
    storageProvider: claimDocumentStorageProvider("storage_provider").notNull().default("R2"),
    securityStatus: claimDocumentSecurityStatus("security_status").notNull().default("PENDING_VALIDATION"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    status: claimDocumentStatus("status").notNull().default("PENDING_UPLOAD"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("claim_documents_claim_created_idx").on(table.claimId, table.createdAt),
    index("claim_documents_claim_requirement_idx").on(table.claimId, table.evidenceRequirementId),
  ],
);

export const claimDocumentUploads = pgTable(
  "claim_document_uploads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
    evidenceRequirementId: uuid("evidence_requirement_id").references(() => claimEvidenceRequirements.id, { onDelete: "set null" }),
    documentId: uuid("document_id").references(() => claimDocuments.id, { onDelete: "set null" }),
    objectKey: text("object_key").notNull().unique(),
    category: claimDocumentCategory("category").notNull(),
    displayName: text("display_name").notNull(),
    originalFilename: text("original_filename").notNull(),
    declaredMimeType: text("declared_mime_type").notNull(),
    declaredSizeBytes: bigint("declared_size_bytes", { mode: "number" }).notNull(),
    status: claimDocumentUploadStatus("status").notNull().default("AUTHORIZED"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  },
  (table) => [
    index("claim_document_uploads_claim_status_idx").on(table.claimId, table.status),
    index("claim_document_uploads_expires_idx").on(table.expiresAt),
  ],
);

export type ClaimEvidenceRequirement = typeof claimEvidenceRequirements.$inferSelect;
export type ClaimDocument = typeof claimDocuments.$inferSelect;
export type ClaimDocumentUpload = typeof claimDocumentUploads.$inferSelect;
