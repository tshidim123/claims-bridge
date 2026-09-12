import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { hasPermissionForRole } from "@/config/staff";
import { claimStatusConfig } from "@/config/claim-statuses";
import { claimNextStepConfig } from "@/config/claim-tracking";
import { getDb } from "@/lib/db";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { eligibilityAssessments } from "@/lib/db/schema/eligibility";
import { claims, claimTimelineEvents } from "@/lib/db/schema/claims";
import {
  eligibilityLeads,
  preAccountEligibilityAssessments,
  eligibilityLeadConversionTokens,
} from "@/lib/db/schema/leads";
import { emailOutbox } from "@/lib/db/schema/communications";
import { staffUsers, staffAuditEvents } from "@/lib/db/schema/staff";
import { recordStaffAuditEvent, type StaffDbExecutor } from "@/lib/staff/audit";
import { requestEvidenceForStaff } from "@/lib/admin/claims/workflow-service";
import { createClientActionRequirement } from "@/lib/admin/claims/action-service";
import { createClaimNotificationInTransaction } from "@/lib/notifications/repository";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import type { EligibilityAnswers } from "@/lib/eligibility/types";
import { hashLeadToken } from "@/lib/leads/reference";
import {
  buildEmailOutboxValues,
  type EmailRecipient,
  type ServiceUpdatePayload,
} from "./email";
import {
  actionPresets,
  canRemindStartClaim,
  manualCommunicationSchema,
  manualDestination,
  manualSubject,
} from "./manual-policy";

export class ManualCommunicationError extends Error {}
const unavailable = () =>
  new ManualCommunicationError(
    "This communication is unavailable for the selected recipient and context.",
  );

/** All targeting, dedupe, domain mutation, outbox and audit changes share one transaction. */
export async function triggerCommunicationInTransaction(
  tx: StaffDbExecutor,
  clerkUserId: string,
  raw: unknown,
) {
  const actor = (
    await tx
      .select()
      .from(staffUsers)
      .where(eq(staffUsers.clerkUserId, clerkUserId))
      .limit(1)
      .for("share")
  )[0];
  if (
    !actor ||
    actor.status !== "ACTIVE" ||
    !hasPermissionForRole(actor.role, "COMMUNICATIONS_SEND")
  )
    throw new ManualCommunicationError(
      "You do not have permission to send client communications.",
    );
  const parsed = manualCommunicationSchema.safeParse(raw);
  if (!parsed.success)
    throw new ManualCommunicationError(
      parsed.error.issues[0]?.message ?? "Check the communication fields.",
    );
  const input = parsed.data;
  const profile = input.clientReference
    ? (
        await tx
          .select()
          .from(clientProfiles)
          .where(eq(clientProfiles.clientReference, input.clientReference))
          .limit(1)
          .for("update")
      )[0]
    : undefined;
  if (input.clientReference && !profile) throw unavailable();
  const assessment =
    profile && input.assessmentReference
      ? (
          await tx
            .select()
            .from(eligibilityAssessments)
            .where(
              and(
                eq(eligibilityAssessments.clientProfileId, profile.id),
                eq(
                  eligibilityAssessments.assessmentReference,
                  input.assessmentReference,
                ),
              ),
            )
            .limit(1)
            .for("update")
        )[0]
      : undefined;
  if (profile && input.assessmentReference && !assessment) throw unavailable();
  const pre =
    !profile && input.assessmentReference
      ? (
          await tx
            .select({
              assessment: preAccountEligibilityAssessments,
              lead: eligibilityLeads,
            })
            .from(preAccountEligibilityAssessments)
            .innerJoin(
              eligibilityLeads,
              eq(eligibilityLeads.id, preAccountEligibilityAssessments.leadId),
            )
            .where(
              eq(
                preAccountEligibilityAssessments.assessmentReference,
                input.assessmentReference,
              ),
            )
            .limit(1)
            .for("update")
        )[0]
      : undefined;
  if (
    !profile &&
    (!pre ||
      pre.lead.convertedClientProfileId ||
      pre.assessment.convertedAt ||
      ["CLOSED", "CONVERTED"].includes(pre.lead.status))
  )
    throw unavailable();
  const claim =
    profile && input.claimReference
      ? (
          await tx
            .select()
            .from(claims)
            .where(
              and(
                eq(claims.clientProfileId, profile.id),
                eq(claims.claimReference, input.claimReference),
              ),
            )
            .limit(1)
            .for("update")
        )[0]
      : undefined;
  if (
    input.claimReference &&
    (!claim ||
      claim.archivedAt ||
      (assessment && claim.eligibilityAssessmentId !== assessment.id))
  )
    throw unavailable();
  const recipient: EmailRecipient = profile
    ? {
        mode: "DEFERRED",
        recipientType: "CLIENT",
        recipientReference: profile.clientReference,
      }
    : {
        mode: "SNAPSHOT",
        recipientType: "PRE_ACCOUNT",
        recipientReference: pre!.lead.leadReference,
        email: pre!.lead.normalizedEmail,
      };
  const scope = `CB-COM-${createHash("sha256").update(`${actor.staffReference}:${recipient.recipientReference}:${input.requestId}`).digest("hex").slice(0, 32).toUpperCase()}`;
  const previous = (
    await tx
      .select({ reference: staffAuditEvents.targetReference })
      .from(staffAuditEvents)
      .where(
        and(
          eq(staffAuditEvents.action, "COMMUNICATION_TRIGGERED"),
          sql`${staffAuditEvents.metadata}->>'communicationReference' = ${scope}`,
        ),
      )
      .limit(1)
  )[0];
  if (previous?.reference)
    return { emailReference: previous.reference, reused: true };
  let dedupeKey = scope;
  if (input.preset === "REQUEST_DOCUMENTS") {
    const result = await requestEvidenceForStaff(
      clerkUserId,
      claim!.claimReference,
      input.evidenceType!,
      { dueDate: input.dueDate },
      tx,
    );
    dedupeKey = `EVIDENCE_REQUESTED:${result.requirementReference}`;
  } else if (actionPresets.includes(input.preset)) {
    const result = await createClientActionRequirement(
      clerkUserId,
      claim!.claimReference,
      {
        type:
          input.preset === "MISSING_INFORMATION"
            ? "CONFIRM_INFORMATION"
            : input.actionType!,
        title: input.title!,
        description: input.body!,
        dueDate: input.dueDate,
        requestId: input.requestId,
      },
      tx,
    );
    dedupeKey = `CLIENT_ACTION_REQUIRED:${result.actionReference}`;
  } else if (input.preset === "CLAIM_UPDATE") {
    const stage = claimStatusConfig[claim!.status];
    const next = claimNextStepConfig[claim!.status];
    const summary = `Current stage: ${stage.label}. ${next.explanation}`;
    await tx
      .insert(claimTimelineEvents)
      .values({
        claimId: claim!.id,
        eventType: "STATUS_UPDATED",
        title: "Claim update shared",
        description: summary,
        visibility: "CLIENT",
        occurredAt: new Date(),
      });
    await tx
      .insert(emailOutbox)
      .values(
        buildEmailOutboxValues({
          event: "CLAIM_STATUS_UPDATED",
          recipient,
          payload: {
            claimReference: claim!.claimReference,
            heading: "An update on your claim",
            summary,
            nextStep:
              "Review your claim for the current requests, actions and messages.",
            actionRequired: false,
          },
          dedupeKey,
        }),
      );
    await createClaimNotificationInTransaction(tx, {
      claimId: claim!.id,
      type: "CLAIM_PROGRESS_UPDATE",
      dedupeKey: scope,
    });
  } else {
    let destination = manualDestination(input);
    const current = assessment ?? pre?.assessment;
    let payload: ServiceUpdatePayload;
    if (input.preset !== "GENERAL_SERVICE_UPDATE") {
      if (!current || current.status !== "COMPLETE") throw unavailable();
      const outcome = buildAssessmentOutcome(
        current.answers as EligibilityAnswers,
      );
      const linked = assessment
        ? (
            await tx
              .select({ id: claims.id })
              .from(claims)
              .where(eq(claims.eligibilityAssessmentId, assessment.id))
              .limit(1)
          )[0]
        : undefined;
      if (
        input.preset === "START_CLAIM_REMINDER" &&
        !canRemindStartClaim(
          {
            status: current.status,
            completed: assessment ? Boolean(assessment.completedAt) : true,
            outcome: outcome.type,
          },
          Boolean(linked),
        )
      )
        throw unavailable();
      if (pre) {
        const token = randomBytes(32).toString("base64url");
        await tx
          .insert(eligibilityLeadConversionTokens)
          .values({
            leadId: pre.lead.id,
            tokenHash: hashLeadToken(token),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
          });
        destination = `/sign-up?redirect_url=${encodeURIComponent(`/account/onboarding?lead=${token}`)}`;
      }
      payload = {
        reference: current.assessmentReference,
        title: manualSubject(input),
        body: `${outcome.headline}. ${outcome.explanation}`,
        nextStep:
          "Create or sign into your account to review your securely linked assessment. Starting a claim is your choice and requires a separate confirmation.",
        destination,
        cta:
          input.preset === "START_CLAIM_REMINDER"
            ? "START MY CLAIM"
            : "REVIEW MY ASSESSMENT",
      };
    } else {
      payload = {
        reference: profile!.clientReference,
        title: input.title!,
        body: input.body!,
        nextStep: input.nextStep!,
        destination,
        cta:
          input.destination === "CLAIM" ? "VIEW MY CLAIM" : "OPEN MY ACCOUNT",
      };
    }
    await tx
      .insert(emailOutbox)
      .values(
        buildEmailOutboxValues({
          event: input.preset as
            | "START_CLAIM_REMINDER"
            | "ASSESSMENT_FOLLOW_UP"
            | "GENERAL_SERVICE_UPDATE",
          recipient,
          payload,
          dedupeKey,
        }),
      );
  }
  const queued = (
    await tx
      .select({
        emailReference: emailOutbox.emailReference,
        eventKey: emailOutbox.eventKey,
      })
      .from(emailOutbox)
      .where(eq(emailOutbox.dedupeKey, dedupeKey))
      .limit(1)
  )[0];
  if (!queued) throw unavailable();
  await recordStaffAuditEvent(tx, {
    actorType: "STAFF",
    actorStaffUserId: actor.id,
    action: "COMMUNICATION_TRIGGERED",
    targetType: "COMMUNICATION",
    targetReference: queued.emailReference,
    metadata: {
      communicationReference: scope,
      emailReference: queued.emailReference,
      communicationEvent: queued.eventKey,
      communicationPreset: input.preset,
    },
  });
  return { emailReference: queued.emailReference, reused: false };
}

export async function triggerManualCommunication(
  clerkUserId: string,
  input: unknown,
) {
  return getDb().transaction((tx) =>
    triggerCommunicationInTransaction(tx, clerkUserId, input),
  );
}
