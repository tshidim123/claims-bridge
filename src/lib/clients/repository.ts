import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { createClientReference } from "@/lib/clients/reference";
import type { OnboardingInput } from "./validation";
export async function getClientProfileByClerkId(clerkUserId: string) { const db = getDb(); return (await db.select().from(clientProfiles).where(eq(clientProfiles.clerkUserId, clerkUserId)).limit(1))[0]; }
export async function upsertClientProfile(clerkUserId: string, input: OnboardingInput) { const db = getDb(); const now = new Date(); const rows = await db.insert(clientProfiles).values({ clientReference: createClientReference(), clerkUserId, firstName: input.firstName, lastName: input.lastName, phone: input.phone || null, preferredContactMethod: input.preferredContactMethod, onboardingStatus: "COMPLETE", onboardingCompletedAt: now, updatedAt: now }).onConflictDoUpdate({ target: clientProfiles.clerkUserId, set: { firstName: input.firstName, lastName: input.lastName, phone: input.phone || null, preferredContactMethod: input.preferredContactMethod, onboardingStatus: "COMPLETE", onboardingCompletedAt: now, updatedAt: now } }).returning(); return rows[0]; }
export async function updateClientProfileForClient(clerkUserId: string, input: OnboardingInput) { const db = getDb(); const profile = await getClientProfileByClerkId(clerkUserId); if (!profile) throw new Error("Client profile not found."); const now = new Date(); return (await db.update(clientProfiles).set({ firstName: input.firstName, lastName: input.lastName, phone: input.phone || null, preferredContactMethod: input.preferredContactMethod, updatedAt: now }).where(eq(clientProfiles.id, profile.id)).returning())[0]; }
