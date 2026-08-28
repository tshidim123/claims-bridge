import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { clientActionConfig, isClientActionStatus, type ClientActionStatus } from "@/config/client-actions";
import { getClaimForClient } from "@/lib/claims/repository";
import { getDb } from "@/lib/db";
import { claimActionRequirements } from "@/lib/db/schema/actions";

type DbClient = ReturnType<typeof getDb>;
type DbTransaction = Parameters<DbClient["transaction"]>[0] extends (tx: infer T, ...args: never[]) => unknown ? T : never;
export type ActionDbExecutor = DbClient | DbTransaction;

export class ClientActionError extends Error {
  constructor(public readonly code: "NOT_FOUND" | "INVALID_STATUS" | "NOT_CLIENT_COMPLETABLE" | "CONCURRENT_CHANGE") {
    super(code);
    this.name = "ClientActionError";
  }
}

export async function getClientActionRequirementsForClaim(clerkUserId: string, claimReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned) return undefined;
  const rows = await getDb().select().from(claimActionRequirements).where(and(eq(claimActionRequirements.claimId, owned.claim.id), eq(claimActionRequirements.clientVisible, true))).orderBy(asc(claimActionRequirements.createdAt));
  return rows.map((row) => ({ actionReference: row.actionReference, type: row.type, title: row.title, description: row.description, status: row.status, priority: row.priority, dueAt: row.dueAt?.toISOString() ?? null, clientCanComplete: clientActionConfig[row.type].clientCanComplete, createdAt: row.createdAt.toISOString() }));
}

export async function completeClientActionForClient(clerkUserId: string, claimReference: string, actionReference: string) {
  const owned = await getClaimForClient(clerkUserId, claimReference);
  if (!owned) throw new ClientActionError("NOT_FOUND");
  const db = getDb();
  return db.transaction(async (tx) => {
    const current = (await tx.select({ id: claimActionRequirements.id, type: claimActionRequirements.type, status: claimActionRequirements.status }).from(claimActionRequirements).where(and(eq(claimActionRequirements.claimId, owned.claim.id), eq(claimActionRequirements.actionReference, actionReference), eq(claimActionRequirements.clientVisible, true))).limit(1))[0];
    if (!current) throw new ClientActionError("NOT_FOUND");
    if (!isClientActionStatus(current.status) || current.status !== "OPEN") throw new ClientActionError("INVALID_STATUS");
    if (!clientActionConfig[current.type].clientCanComplete) throw new ClientActionError("NOT_CLIENT_COMPLETABLE");
    const completedAt = new Date();
    const updated = (await tx.update(claimActionRequirements).set({ status: "COMPLETED", completedAt, updatedAt: completedAt }).where(and(eq(claimActionRequirements.id, current.id), eq(claimActionRequirements.status, "OPEN"))).returning({ actionReference: claimActionRequirements.actionReference }))[0];
    if (!updated) throw new ClientActionError("CONCURRENT_CHANGE");
    return updated;
  });
}

export function isActionStatus(value: string): value is ClientActionStatus { return isClientActionStatus(value); }
