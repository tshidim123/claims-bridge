import * as nextEnv from "@next/env";
import { clerkClient } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";

import * as schema from "../src/lib/db/schema";
import { staffAuditEvents, staffUsers } from "../src/lib/db/schema/staff";
import { createStaffReference } from "../src/lib/staff/reference";

const { loadEnvConfig } = nextEnv;

function fail(message: string): never { throw new Error(message); }

async function main() {
  loadEnvConfig(process.cwd(), true);
  if (!process.env.DATABASE_URL) fail("DATABASE_URL is required for staff bootstrap.");
  const staffBootstrapId = process.env.STAFF_BOOTSTRAP_CLERK_USER_ID?.trim();
  const compatibilityId = process.env.BOOTSTRAP_SUPER_ADMIN_CLERK_USER_ID?.trim();
  if (staffBootstrapId && compatibilityId && staffBootstrapId !== compatibilityId) fail("Conflicting bootstrap identity configuration was found.");
  const clerkUserId = staffBootstrapId || compatibilityId;
  if (!clerkUserId) fail("STAFF_BOOTSTRAP_CLERK_USER_ID is required for staff bootstrap.");
  const displayName = process.env.STAFF_BOOTSTRAP_DISPLAY_NAME?.trim() || process.env.BOOTSTRAP_SUPER_ADMIN_DISPLAY_NAME?.trim() || null;

  let user;
  try { user = await (await clerkClient()).users.getUser(clerkUserId); } catch { fail("The explicit bootstrap Clerk identity could not be verified."); }
  if (!user.emailAddresses.some((address) => address.verification?.status === "verified")) fail("The explicit bootstrap identity must have a verified email address.");

  const db = drizzle(neon(process.env.DATABASE_URL), { schema });
  const result = await db.transaction(async (tx) => {
    const existing = (await tx.select().from(staffUsers).where(eq(staffUsers.clerkUserId, clerkUserId)).limit(1))[0];
    const staffCount = (await tx.select({ id: staffUsers.id }).from(staffUsers)).length;
    if (existing && staffCount === 1 && existing.role === "SUPER_ADMIN" && existing.status === "ACTIVE") return { reference: existing.staffReference, state: "already active" };
    if (staffCount > 0) fail("Staff bootstrap is closed because staff records already exist. Use controlled staff administration.");

    const staffReference = createStaffReference();
    const inserted = (await tx.insert(staffUsers).values({ staffReference, clerkUserId, displayName, role: "SUPER_ADMIN", status: "ACTIVE" }).returning())[0];
    await tx.insert(staffAuditEvents).values({ actorType: "SYSTEM", action: "STAFF_BOOTSTRAPPED", targetType: "STAFF_USER", targetReference: inserted.staffReference });
    return { reference: staffReference, state: "created" };
  });

  console.log(`Bootstrap identity verified; staff record ${result.state}.`);
  console.log(`Resulting role: SUPER_ADMIN. Staff reference: ${result.reference}.`);
}

main().catch((error: unknown) => {
  console.error(`Bootstrap failed: ${error instanceof Error ? error.message : "The controlled bootstrap could not be completed."}`);
  process.exitCode = 1;
});
