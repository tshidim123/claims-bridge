import "server-only";

import { and, eq } from "drizzle-orm";

import { canTransitionClaimStatus, claimStatusConfig, isClaimStatus, isTerminalClaimStatus } from "@/config/claim-statuses";
import { getTransitionTimeline } from "@/config/claim-tracking";
import { claimStatusNotificationTypes } from "@/config/notifications";
import { getDb } from "@/lib/db";
import { claimStatusHistory, claimTimelineEvents, claims } from "@/lib/db/schema/claims";
import { createClaimNotificationInTransaction } from "@/lib/notifications/repository";
import type { StaffDbExecutor } from "@/lib/staff/audit";

export class ClaimTransitionError extends Error {
  constructor(public readonly code: "CLAIM_NOT_FOUND" | "CLAIM_ARCHIVED" | "INVALID_STATUS" | "INVALID_TRANSITION" | "TERMINAL_STATUS" | "CONCURRENT_TRANSITION") {
    super(code);
    this.name = "ClaimTransitionError";
  }
}

type TransitionOptions = { actorType?: string; createTimelineEvent?: boolean };

export async function transitionClaimStatusInTransaction(executor: StaffDbExecutor, claimId: string, requestedStatus: string, options: TransitionOptions = {}) {
  if (!isClaimStatus(requestedStatus)) throw new ClaimTransitionError("INVALID_STATUS");
  const current = (await executor.select().from(claims).where(eq(claims.id, claimId)).limit(1))[0];
  if (!current) throw new ClaimTransitionError("CLAIM_NOT_FOUND");
  if (current.archivedAt) throw new ClaimTransitionError("CLAIM_ARCHIVED");
  if (!isClaimStatus(current.status)) throw new ClaimTransitionError("INVALID_STATUS");
  if (isTerminalClaimStatus(current.status)) throw new ClaimTransitionError("TERMINAL_STATUS");
  if (!canTransitionClaimStatus(current.status, requestedStatus)) throw new ClaimTransitionError("INVALID_TRANSITION");

  const now = new Date();
  const updated = (await executor.update(claims).set({ status: requestedStatus, updatedAt: now, closedAt: isTerminalClaimStatus(requestedStatus) ? now : null }).where(and(eq(claims.id, claimId), eq(claims.status, current.status))).returning())[0];
  if (!updated) throw new ClaimTransitionError("CONCURRENT_TRANSITION");

  const history = (await executor.insert(claimStatusHistory).values({ claimId, fromStatus: current.status, toStatus: requestedStatus, eventType: "STATUS_CHANGED", actorType: options.actorType ?? "SYSTEM", createdAt: now }).returning({ id: claimStatusHistory.id }))[0];

  const notificationType = claimStatusNotificationTypes[requestedStatus];
  if (notificationType && history) {
    await createClaimNotificationInTransaction(executor, {
      claimId,
      type: notificationType,
      context: { statusLabel: claimStatusConfig[requestedStatus].label },
      sourceType: "CLAIM_STATUS",
      sourceId: history.id,
      dedupeKey: `claim-status:${history.id}`,
    });
  }

  const timeline = options.createTimelineEvent === false ? null : getTransitionTimeline(requestedStatus);
  if (timeline) await executor.insert(claimTimelineEvents).values({ claimId, eventType: timeline.eventType, title: timeline.title, description: timeline.description, visibility: "CLIENT", occurredAt: now, createdAt: now });

  return { updated, previousStatus: current.status, historyId: history?.id ?? null };
}

export async function transitionClaimStatus(claimId: string, requestedStatus: string, options: TransitionOptions = {}) {
  const db = getDb();
  return (await db.transaction((tx) => transitionClaimStatusInTransaction(tx, claimId, requestedStatus, options))).updated;
}
