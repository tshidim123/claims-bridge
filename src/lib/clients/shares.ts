import "server-only";

import crypto from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { clientProfiles, clientProfileShares } from "@/lib/db/schema/client-profiles";
import { createClientReference } from "@/lib/clients/reference";
import type { ProfileShareInput } from "@/lib/clients/validation";

const durationMs = { "1h": 60 * 60_000, "24h": 24 * 60 * 60_000, "7d": 7 * 24 * 60 * 60_000 } as const;
const tokenHash = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
const shareReference = () => createClientReference().replace("CB-CLT", "CB-PSH");

async function ownedProfile(clerkUserId: string) {
  const profile = (await getDb().select().from(clientProfiles).where(eq(clientProfiles.clerkUserId, clerkUserId)).limit(1))[0];
  if (!profile) throw new Error("Client profile not found.");
  return profile;
}

export async function createProfileShare(clerkUserId: string, input: ProfileShareInput) {
  const profile = await ownedProfile(clerkUserId);
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + durationMs[input.duration]);
  await getDb().insert(clientProfileShares).values({ shareReference: shareReference(), clientProfileId: profile.id, tokenHash: tokenHash(token), selectedFields: [...new Set(input.selectedFields)], expiresAt });
  return { token, expiresAt };
}

export async function listProfileShares(clerkUserId: string) {
  const profile = await ownedProfile(clerkUserId);
  return getDb().select({ shareReference: clientProfileShares.shareReference, selectedFields: clientProfileShares.selectedFields, expiresAt: clientProfileShares.expiresAt, revokedAt: clientProfileShares.revokedAt, createdAt: clientProfileShares.createdAt }).from(clientProfileShares).where(eq(clientProfileShares.clientProfileId, profile.id)).orderBy(desc(clientProfileShares.createdAt)).limit(12);
}

export async function revokeProfileShare(clerkUserId: string, shareReferenceValue: string) {
  const profile = await ownedProfile(clerkUserId);
  const updated = (await getDb().update(clientProfileShares).set({ revokedAt: new Date() }).where(and(eq(clientProfileShares.clientProfileId, profile.id), eq(clientProfileShares.shareReference, shareReferenceValue), isNull(clientProfileShares.revokedAt))).returning({ shareReference: clientProfileShares.shareReference }))[0];
  if (!updated) throw new Error("Share link unavailable.");
}

export async function getPublicProfileShare(token: string) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return undefined;
  const row = (await getDb().select({ share: clientProfileShares, profile: clientProfiles }).from(clientProfileShares).innerJoin(clientProfiles, eq(clientProfiles.id, clientProfileShares.clientProfileId)).where(and(eq(clientProfileShares.tokenHash, tokenHash(token)), isNull(clientProfileShares.revokedAt), gt(clientProfileShares.expiresAt, new Date()))).limit(1))[0];
  if (!row) return undefined;
  return { fields: new Set(row.share.selectedFields), profile: { firstName: row.profile.firstName, lastName: row.profile.lastName, bio: row.profile.bio, phone: row.profile.phone, city: row.profile.city, region: row.profile.region } };
}
