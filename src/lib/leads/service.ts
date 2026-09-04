import "server-only";
import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import {
  eligibilityAssessments,
  eligibilityHandoffs,
} from "@/lib/db/schema/eligibility";
import {
  eligibilityLeadConversionTokens,
  eligibilityLeadNotes,
  eligibilityLeads,
  preAccountEligibilityAssessments,
} from "@/lib/db/schema/leads";
import { emailOutbox } from "@/lib/db/schema/communications";
import {
  assessmentReceiptValues,
  buildEmailOutboxValues,
} from "@/lib/communications/email";
import { createNotification } from "@/lib/notifications/repository";
import { staffUsers } from "@/lib/db/schema/staff";
import { createAssessmentReference } from "@/lib/eligibility/persistence/reference";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import { assessmentPayloadSchema } from "@/lib/eligibility/persistence/validation";
import { hashHandoffToken } from "@/lib/eligibility/persistence/repository";
import { createLeadReference, hashLeadToken } from "./reference";
import {
  leadCaptureSchema,
  preAccountAssessmentCaptureSchema,
} from "./validation";
import { recordStaffAuditEvent } from "@/lib/staff/audit";
import {
  getStaffRecordByClerkId,
  requirePermission,
} from "@/lib/staff/authorization";
import { emitStaffCommunicationInTransaction } from "@/lib/communications/staff-notifications";

const HANDOFF_MINUTES = 45;
const CONVERSION_MINUTES = 30;
const CONSENT_VERSION = "service-contact-v1";
const MARKETING_VERSION = "marketing-v1";

export type LeadCaptureResult = {
  leadReference: string;
  conversionToken: string;
};
export type PreAccountCaptureResult = LeadCaptureResult & {
  assessmentReference: string;
};

function token() {
  return crypto.randomBytes(32).toString("base64url");
}
function safePayload(payload: unknown) {
  return assessmentPayloadSchema.parse(payload);
}

export async function createPreAccountAssessment(
  input: unknown,
): Promise<PreAccountCaptureResult> {
  const parsed = preAccountAssessmentCaptureSchema.parse(input);
  if (parsed.honeypot) throw new Error("Invalid assessment capture.");
  const assessment = safePayload(parsed.assessment);
  if (assessment.status !== "complete")
    throw new Error("Complete the assessment before saving it.");
  const outcome = buildAssessmentOutcome(assessment.answers);
  const conversionToken = token();
  const now = new Date();
  const associationHash = hashLeadToken(parsed.associationKey);
  const db = getDb();
  return db.transaction(async (tx) => {
    const existing = (
      await tx
        .select({
          leadReference: eligibilityLeads.leadReference,
          assessmentReference:
            preAccountEligibilityAssessments.assessmentReference,
        })
        .from(eligibilityLeads)
        .innerJoin(
          preAccountEligibilityAssessments,
          eq(preAccountEligibilityAssessments.leadId, eligibilityLeads.id),
        )
        .where(eq(eligibilityLeads.handoffAssociationHash, associationHash))
        .limit(1)
    )[0];
    if (existing)
      throw new Error(
        "This assessment has already been saved. Please continue with your account.",
      );
    const handoffToken = token();
    const handoff = (
      await tx
        .insert(eligibilityHandoffs)
        .values({
          tokenHash: hashHandoffToken(handoffToken),
          assessmentVersion: String(assessment.version),
          payload: assessment,
          expiresAt: new Date(now.getTime() + HANDOFF_MINUTES * 60_000),
        })
        .returning({ id: eligibilityHandoffs.id })
    )[0];
    if (!handoff) throw new Error("Could not create secure continuation.");
    const lead = (
      await tx
        .insert(eligibilityLeads)
        .values({
          leadReference: createLeadReference(),
          handoffAssociationHash: associationHash,
          handoffTokenHash: hashHandoffToken(handoffToken),
          firstName: parsed.firstName,
          lastName: parsed.lastName,
          email: parsed.email || "",
          normalizedEmail: parsed.email || "",
          phone: parsed.phone || null,
          preferredContactMethod: parsed.preferredContactMethod,
          outcomeType: outcome.type,
          issueTags: [outcome.type],
          landingPath: "/check-eligibility",
          serviceContactConsentAt: now,
          serviceContactConsentVersion: CONSENT_VERSION,
          marketingConsent: parsed.marketingConsent,
          marketingConsentAt: parsed.marketingConsent ? now : null,
          marketingConsentVersion: parsed.marketingConsent
            ? MARKETING_VERSION
            : null,
        })
        .returning({
          id: eligibilityLeads.id,
          leadReference: eligibilityLeads.leadReference,
        })
    )[0];
    if (!lead) throw new Error("Could not save this assessment.");
    const preAccount = (
      await tx
        .insert(preAccountEligibilityAssessments)
        .values({
          assessmentReference: createAssessmentReference(),
          leadId: lead.id,
          assessmentVersion: String(assessment.version),
          status: "COMPLETE",
          answers: assessment.answers,
          preliminaryOutcome: outcome.type,
          startedAt: assessment.startedAt
            ? new Date(assessment.startedAt)
            : now,
          updatedAt: now,
        })
        .returning({
          assessmentReference:
            preAccountEligibilityAssessments.assessmentReference,
        })
    )[0];
    if (!preAccount) throw new Error("Could not save this assessment.");
    await tx
      .insert(emailOutbox)
      .values(
        assessmentReceiptValues(parsed.email, lead.leadReference, {
          assessmentReference: preAccount.assessmentReference,
          outcome: outcome.headline,
          explanation: outcome.explanation,
          evidence: outcome.evidence.map(({ label, description }) => ({
            label,
            description,
          })),
          continuationUrl: `${(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")}/sign-up?redirect_url=${encodeURIComponent(`/account/onboarding?lead=${conversionToken}`)}`,
        }),
      )
      .onConflictDoNothing({ target: emailOutbox.dedupeKey });
    await emitStaffCommunicationInTransaction(tx, {
      event: "NEW_PRE_ACCOUNT_ASSESSMENT",
      reference: preAccount.assessmentReference,
      summary: `${outcome.headline}. Preferred contact: ${parsed.preferredContactMethod}.`,
      destination: `/admin/assessments/${encodeURIComponent(preAccount.assessmentReference)}`,
      dedupeScope: preAccount.assessmentReference,
    });
    await tx.insert(eligibilityLeadConversionTokens).values({
      leadId: lead.id,
      tokenHash: hashLeadToken(conversionToken),
      expiresAt: new Date(now.getTime() + CONVERSION_MINUTES * 60_000),
    });
    return {
      leadReference: lead.leadReference,
      assessmentReference: preAccount.assessmentReference,
      conversionToken,
    };
  });
}

export async function createDurableLead(
  input: unknown,
): Promise<LeadCaptureResult> {
  const parsed = leadCaptureSchema.parse(input);
  if (parsed.honeypot) throw new Error("Invalid lead capture.");
  const assessment = safePayload(parsed.assessment);
  const outcome = buildAssessmentOutcome(assessment.answers);
  const handoffToken = token();
  const conversionToken = token();
  const now = new Date();
  const associationHash = hashLeadToken(parsed.associationKey);
  const db = getDb();
  return db.transaction(async (tx) => {
    const handoff = (
      await tx
        .insert(eligibilityHandoffs)
        .values({
          tokenHash: hashHandoffToken(handoffToken),
          assessmentVersion: String(assessment.version),
          payload: assessment,
          expiresAt: new Date(now.getTime() + HANDOFF_MINUTES * 60_000),
        })
        .returning({ id: eligibilityHandoffs.id })
    )[0];
    if (!handoff) throw new Error("Could not create secure handoff.");
    const lead = (
      await tx
        .insert(eligibilityLeads)
        .values({
          leadReference: createLeadReference(),
          handoffAssociationHash: associationHash,
          handoffTokenHash: hashHandoffToken(handoffToken),
          firstName: parsed.firstName,
          email: parsed.email,
          normalizedEmail: parsed.email,
          phone: parsed.phone || null,
          preferredContactMethod: parsed.preferredContactMethod,
          outcomeType: outcome.type,
          issueTags: [outcome.type],
          landingPath: "/check-eligibility",
          serviceContactConsentAt: now,
          serviceContactConsentVersion: CONSENT_VERSION,
          marketingConsent: parsed.marketingConsent,
          marketingConsentAt: parsed.marketingConsent ? now : null,
          marketingConsentVersion: parsed.marketingConsent
            ? MARKETING_VERSION
            : null,
        })
        .returning({
          id: eligibilityLeads.id,
          leadReference: eligibilityLeads.leadReference,
        })
    )[0];
    if (!lead) throw new Error("Could not create lead.");
    await tx.insert(eligibilityLeadConversionTokens).values({
      leadId: lead.id,
      tokenHash: hashLeadToken(conversionToken),
      expiresAt: new Date(now.getTime() + CONVERSION_MINUTES * 60_000),
    });
    return { leadReference: lead.leadReference, conversionToken };
  });
}

export async function convertLeadForClient(
  clerkUserId: string,
  conversionToken: string,
) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(conversionToken))
    throw new Error("Invalid conversion token.");
  const db = getDb();
  return db.transaction(async (tx) => {
    const row = (
      await tx
        .select({
          tokenId: eligibilityLeadConversionTokens.id,
          redeemedAt: eligibilityLeadConversionTokens.redeemedAt,
          expiresAt: eligibilityLeadConversionTokens.expiresAt,
          lead: eligibilityLeads,
          handoffHash: eligibilityLeads.handoffTokenHash,
          preAccount: preAccountEligibilityAssessments,
        })
        .from(eligibilityLeadConversionTokens)
        .innerJoin(
          eligibilityLeads,
          eq(eligibilityLeads.id, eligibilityLeadConversionTokens.leadId),
        )
        .leftJoin(
          preAccountEligibilityAssessments,
          eq(preAccountEligibilityAssessments.leadId, eligibilityLeads.id),
        )
        .where(
          eq(
            eligibilityLeadConversionTokens.tokenHash,
            hashLeadToken(conversionToken),
          ),
        )
        .limit(1)
    )[0];
    if (!row)
      throw new Error(
        "This continuation link has expired or has already been used.",
      );
    const profile = (
      await tx
        .select({
          id: clientProfiles.id,
          clientReference: clientProfiles.clientReference,
        })
        .from(clientProfiles)
        .where(eq(clientProfiles.clerkUserId, clerkUserId))
        .limit(1)
    )[0];
    if (!profile) throw new Error("Client profile not found.");
    if (row.lead.convertedClientProfileId) {
      if (row.lead.convertedClientProfileId !== profile.id)
        throw new Error("This continuation belongs to another account.");
      return row.lead.convertedAssessmentId;
    }
    if (row.redeemedAt || row.expiresAt <= new Date())
      throw new Error(
        "This continuation link has expired or has already been used.",
      );
    const handoff = row.preAccount
      ? undefined
      : (
          await tx
            .select()
            .from(eligibilityHandoffs)
            .where(and(eq(eligibilityHandoffs.tokenHash, row.handoffHash)))
            .limit(1)
        )[0];
    if (!row.preAccount && !handoff)
      throw new Error("The eligibility context is no longer available.");
    const payload = row.preAccount
      ? {
          version: Number(row.preAccount.assessmentVersion),
          status: "complete" as const,
          currentStepId: "review",
          outcomeId: row.preAccount.preliminaryOutcome as never,
          answers: row.preAccount.answers as Record<
            string,
            string | string[] | boolean
          >,
          startedAt: row.preAccount.startedAt.toISOString(),
        }
      : safePayload(handoff!.payload);
    const clientOutcome = buildAssessmentOutcome(payload.answers);
    const assessmentVersion =
      row.preAccount?.assessmentVersion ?? handoff!.assessmentVersion;
    const existing = (
      await tx
        .select({
          id: eligibilityAssessments.id,
          assessmentReference: eligibilityAssessments.assessmentReference,
          preliminaryOutcome: eligibilityAssessments.preliminaryOutcome,
        })
        .from(eligibilityAssessments)
        .where(
          and(
            eq(eligibilityAssessments.clientProfileId, profile.id),
            eq(eligibilityAssessments.assessmentVersion, assessmentVersion),
            eq(eligibilityAssessments.answers, payload.answers),
          ),
        )
        .limit(1)
    )[0];
    const now = new Date();
    const assessment =
      existing ??
      (
        await tx
          .insert(eligibilityAssessments)
          .values({
            assessmentReference: createAssessmentReference(),
            clientProfileId: profile.id,
            assessmentVersion,
            status: payload.status === "complete" ? "COMPLETE" : "IN_PROGRESS",
            currentSection: "evidence",
            currentQuestionId: payload.currentStepId,
            answers: payload.answers,
            preliminaryOutcome: payload.outcomeId ?? null,
            startedAt: payload.startedAt ? new Date(payload.startedAt) : now,
            updatedAt: now,
            completedAt: payload.status === "complete" ? now : null,
          })
          .returning({
            id: eligibilityAssessments.id,
            assessmentReference: eligibilityAssessments.assessmentReference,
            preliminaryOutcome: eligibilityAssessments.preliminaryOutcome,
          })
      )[0];
    if (!assessment) throw new Error("Could not save the assessment.");
    const assessmentId = assessment.id;
    await tx
      .update(eligibilityLeads)
      .set({
        status: "CONVERTED",
        convertedAt: now,
        convertedClientProfileId: profile.id,
        convertedAssessmentId: assessmentId,
        updatedAt: now,
      })
      .where(eq(eligibilityLeads.id, row.lead.id));
    if (row.preAccount)
      await tx
        .update(preAccountEligibilityAssessments)
        .set({
          convertedAt: now,
          convertedClientProfileId: profile.id,
          convertedAssessmentId: assessmentId,
          updatedAt: now,
        })
        .where(eq(preAccountEligibilityAssessments.id, row.preAccount.id));
    await tx
      .update(eligibilityLeadConversionTokens)
      .set({ redeemedAt: now })
      .where(eq(eligibilityLeadConversionTokens.id, row.tokenId));
    if (handoff)
      await tx
        .update(eligibilityHandoffs)
        .set({ redeemedAt: now })
        .where(eq(eligibilityHandoffs.id, handoff.id));
    const attachedReference =
      assessment.assessmentReference ?? row.preAccount?.assessmentReference;
    if (attachedReference) {
      await tx
        .insert(emailOutbox)
        .values(
          buildEmailOutboxValues({
            event: "ASSESSMENT_ATTACHED_TO_ACCOUNT",
            recipient: {
              mode: "DEFERRED",
              recipientType: "CLIENT",
              recipientReference: profile.clientReference,
            },
            payload: {
              assessmentReference: attachedReference,
              outcome: clientOutcome.headline,
              assessmentUrl: `/account/assessments/${encodeURIComponent(attachedReference)}`,
            },
            dedupeKey: `ASSESSMENT_ATTACHED:${attachedReference}`,
          }),
        )
        .onConflictDoNothing({ target: emailOutbox.dedupeKey });
      await createNotification(tx, {
        clientProfileId: profile.id,
        type: "ACCOUNT_NOTICE",
        actionReference: attachedReference,
        sourceType: "ASSESSMENT_ATTACHMENT",
        sourceId: assessmentId,
        dedupeKey: `assessment-attached:${attachedReference}`,
      });
    }
    return assessmentId;
  });
}

export async function changeLeadStatus(
  clerkUserId: string,
  leadReference: string,
  status: "NEW" | "CONTACTED" | "FOLLOW_UP" | "CLOSED",
) {
  await requirePermission(clerkUserId, "LEADS_MANAGE");
  const db = getDb();
  const staff = await getStaffRecordByClerkId(clerkUserId);
  if (!staff) throw new Error("Staff record not found.");
  return db.transaction(async (tx) => {
    const current = (
      await tx
        .select({ id: eligibilityLeads.id, status: eligibilityLeads.status })
        .from(eligibilityLeads)
        .where(eq(eligibilityLeads.leadReference, leadReference))
        .limit(1)
    )[0];
    if (!current || current.status === "CONVERTED")
      throw new Error("Lead status cannot be changed.");
    const updated = (
      await tx
        .update(eligibilityLeads)
        .set({
          status,
          closedAt: status === "CLOSED" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(eligibilityLeads.id, current.id))
        .returning()
    )[0];
    await recordStaffAuditEvent(tx, {
      actorStaffUserId: staff.id,
      actorType: "STAFF",
      action: "LEAD_STATUS_CHANGED",
      targetType: "ELIGIBILITY_LEAD",
      targetReference: leadReference,
      metadata: { fromLeadStatus: current.status, toLeadStatus: status },
    });
    return updated;
  });
}

export async function addLeadNote(
  clerkUserId: string,
  leadReference: string,
  body: string,
) {
  const staff = await requirePermission(clerkUserId, "LEADS_MANAGE");
  const db = getDb();
  const lead = (
    await db
      .select({ id: eligibilityLeads.id })
      .from(eligibilityLeads)
      .where(eq(eligibilityLeads.leadReference, leadReference))
      .limit(1)
  )[0];
  if (!lead) throw new Error("Lead not found.");
  const staffUser = (
    await db
      .select({ id: staffUsers.id })
      .from(staffUsers)
      .where(eq(staffUsers.staffReference, staff.staffReference))
      .limit(1)
  )[0];
  if (!staffUser) throw new Error("Staff record not found.");
  return db.transaction(async (tx) => {
    const note = (
      await tx
        .insert(eligibilityLeadNotes)
        .values({
          leadId: lead.id,
          authorStaffUserId: staffUser.id,
          body: body.trim(),
        })
        .returning()
    )[0];
    await recordStaffAuditEvent(tx, {
      actorStaffUserId: staffUser.id,
      actorType: "STAFF",
      action: "LEAD_NOTE_ADDED",
      targetType: "ELIGIBILITY_LEAD",
      targetReference: leadReference,
      metadata: { conversionState: "NOTE_ADDED" },
    });
    return note;
  });
}

export async function getLeadByReference(
  clerkUserId: string,
  leadReference: string,
) {
  await requirePermission(clerkUserId, "LEADS_VIEW");
  const db = getDb();
  return (
    await db
      .select()
      .from(eligibilityLeads)
      .where(eq(eligibilityLeads.leadReference, leadReference))
      .limit(1)
  )[0];
}
export async function getLeadNotes(clerkUserId: string, leadReference: string) {
  await requirePermission(clerkUserId, "LEADS_VIEW");
  const db = getDb();
  return db
    .select({
      body: eligibilityLeadNotes.body,
      createdAt: eligibilityLeadNotes.createdAt,
    })
    .from(eligibilityLeadNotes)
    .innerJoin(
      eligibilityLeads,
      eq(eligibilityLeads.id, eligibilityLeadNotes.leadId),
    )
    .where(eq(eligibilityLeads.leadReference, leadReference))
    .orderBy(desc(eligibilityLeadNotes.createdAt))
    .limit(50);
}
