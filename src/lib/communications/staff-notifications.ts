import "server-only";
import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import {
  hasPermissionForRole,
  type StaffPermission,
  type StaffRole,
} from "@/config/staff";
import { buildEmailOutboxValues } from "@/lib/communications/email";
import { getDb } from "@/lib/db";
import {
  emailOutbox,
  staffNotificationPreferences,
  staffNotifications,
} from "@/lib/db/schema/communications";
import { claimAssignments } from "@/lib/db/schema/operations";
import { staffUsers } from "@/lib/db/schema/staff";

type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<DbClient["transaction"]>[0] extends (
  tx: infer T,
  ...args: never[]
) => unknown
  ? T
  : never;
export type StaffCommunicationExecutor = DbClient | DbTransaction;
type StaffEventDefinition = {
  category:
    | "CLIENTS"
    | "ASSESSMENTS"
    | "CLAIMS"
    | "MESSAGES"
    | "EVIDENCE"
    | "ASSIGNMENTS"
    | "PRIORITY";
  permission: StaffPermission;
  roles: readonly StaffRole[];
  title: string;
  destination: string;
  subject: (reference: string) => string;
  preheader: string;
};
const event = (
  category: StaffEventDefinition["category"],
  permission: StaffPermission,
  roles: readonly StaffRole[],
  title: string,
  destination: string,
  subject: StaffEventDefinition["subject"],
  preheader: string,
): StaffEventDefinition => ({
  category,
  permission,
  roles,
  title,
  destination,
  subject,
  preheader,
});
export const staffNotificationEvents = {
  NEW_CLIENT: event(
    "CLIENTS", "CLIENTS_VIEW", ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER", "SUPPORT"],
    "New client", "/admin/clients", (reference) => `New Claims Bridge client — ${reference}`,
    "A new client has completed account setup.",
  ),
  NEW_PRE_ACCOUNT_ASSESSMENT: event(
    "ASSESSMENTS",
    "LEADS_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER", "SUPPORT"],
    "New lead / eligibility assessment",
    "/admin/assessments",
    (reference) => `New Claims Bridge eligibility assessment — ${reference}`,
    "A new signed-out eligibility assessment has been submitted.",
  ),
  NEW_AUTHENTICATED_ASSESSMENT: event(
    "ASSESSMENTS",
    "CLIENTS_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER"],
    "New authenticated assessment",
    "/admin/assessments",
    (reference) => `New authenticated eligibility assessment — ${reference}`,
    "A signed-in client has completed a new eligibility assessment.",
  ),
  NEW_CLAIM: event(
    "CLAIMS",
    "CLAIMS_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER"],
    "New claim",
    "/admin/claims",
    (reference) => `New Claims Bridge claim — ${reference}`,
    "A client has explicitly created a new claim.",
  ),
  CLIENT_MESSAGE_RECEIVED: event(
    "MESSAGES",
    "MESSAGES_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER", "SUPPORT"],
    "New client message",
    "/admin/messages",
    (reference) => `New client secure message — ${reference}`,
    "A client has sent a new secure message.",
  ),
  EVIDENCE_UPLOADED: event(
    "EVIDENCE",
    "EVIDENCE_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER", "EVIDENCE_REVIEWER"],
    "Evidence uploaded",
    "/admin/evidence",
    (reference) => `New evidence uploaded — ${reference}`,
    "A client document is ready for operational review.",
  ),
  CLIENT_ACTION_COMPLETED: event(
    "CLAIMS",
    "CLAIMS_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER"],
    "Client action completed",
    "/admin/client-actions",
    (reference) => `Client action completed — ${reference}`,
    "A client has completed a requested action.",
  ),
  CLAIM_ASSIGNED: event(
    "ASSIGNMENTS",
    "CLAIMS_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER"],
    "Claim assigned",
    "/admin/claims",
    (reference) =>
      `A Claims Bridge claim has been assigned to you — ${reference}`,
    "A claim is ready for your attention.",
  ),
  HIGH_PRIORITY_CLAIM: event(
    "PRIORITY",
    "CLAIMS_VIEW",
    ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER"],
    "High-priority claim",
    "/admin/claims",
    (reference) => `High-priority Claims Bridge case — ${reference}`,
    "A claim has moved into the high-priority operational queue.",
  ),
} as const;
export type StaffNotificationEvent = keyof typeof staffNotificationEvents;
export type StaffCommunicationInput = {
  event: StaffNotificationEvent;
  reference: string;
  summary: string;
  destination: string;
  dedupeScope: string;
  claimId?: string;
  assignedStaffReference?: string;
  onlyStaffReference?: string;
};
function staffNotificationReference() {
  return `CB-STF-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
}

export async function resolveStaffRecipientsInTransaction(
  executor: StaffCommunicationExecutor,
  input: Pick<
    StaffCommunicationInput,
    "event" | "claimId" | "assignedStaffReference" | "onlyStaffReference"
  >,
) {
  const definition = staffNotificationEvents[input.event];
  const assigned =
    input.assignedStaffReference ??
    (input.claimId
      ? (
          await executor
            .select({ staffReference: staffUsers.staffReference })
            .from(claimAssignments)
            .innerJoin(
              staffUsers,
              eq(staffUsers.id, claimAssignments.staffUserId),
            )
            .where(
              and(
                eq(claimAssignments.claimId, input.claimId),
                isNull(claimAssignments.unassignedAt),
              ),
            )
            .limit(1)
        )[0]?.staffReference
      : undefined);
  const active = await executor
    .select()
    .from(staffUsers)
    .where(eq(staffUsers.status, "ACTIVE"));
  const preferences = await executor
    .select()
    .from(staffNotificationPreferences)
    .where(eq(staffNotificationPreferences.category, definition.category));
  return active
    .filter((member) =>
      (input.onlyStaffReference
        ? member.staffReference === input.onlyStaffReference
        : (member.staffReference === assigned ||
            definition.roles.includes(member.role))) &&
          hasPermissionForRole(member.role, definition.permission) &&
          member.role !== "READ_ONLY",
    )
    .map((member) => {
      const preference = preferences.find(
        (entry) => entry.staffUserId === member.id,
      );
      return {
        ...member,
        emailEnabled: preference?.emailEnabled !== false,
        inAppEnabled: preference?.inAppEnabled !== false,
      };
    });
}

export async function emitStaffCommunicationInTransaction(
  executor: StaffCommunicationExecutor,
  input: StaffCommunicationInput,
) {
  const definition = staffNotificationEvents[input.event];
  const recipients = await resolveStaffRecipientsInTransaction(executor, input);
  await Promise.all(
    recipients.flatMap((staff) => {
      const dedupeKey = `STAFF_${input.event}:${input.dedupeScope}:${staff.staffReference}`;
      return [
        ...(staff.inAppEnabled
          ? [
              executor
                .insert(staffNotifications)
                .values({
                  notificationReference: staffNotificationReference(),
                  staffUserId: staff.id,
                  eventKey: input.event,
                  category: definition.category,
                  title: definition.title,
                  body: input.summary,
                  destination: input.destination || definition.destination,
                  dedupeKey,
                })
                .onConflictDoNothing({ target: staffNotifications.dedupeKey }),
            ]
          : []),
        ...(staff.emailEnabled
          ? [
              executor
                .insert(emailOutbox)
                .values(
                  buildEmailOutboxValues({
                    event: input.event,
                    recipient: {
                      mode: "DEFERRED",
                      recipientType: "STAFF",
                      recipientReference: staff.staffReference,
                    },
                    payload: {
                      reference: input.reference,
                      summary: input.summary,
                      destination: input.destination,
                      subject: definition.subject(input.reference),
                      preheader: definition.preheader,
                      occurredAt: new Date().toISOString(),
                    },
                    dedupeKey,
                  }),
                )
                .onConflictDoNothing({ target: emailOutbox.dedupeKey }),
            ]
          : []),
      ];
    }),
  );
  return recipients;
}
export async function resolveStaffRecipients(event: StaffNotificationEvent) {
  return resolveStaffRecipientsInTransaction(getDb(), { event });
}
