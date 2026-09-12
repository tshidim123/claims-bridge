import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { staffUsers } from "@/lib/db/schema/staff";
import { normalizeMailbox } from "./config";

export type RecipientFailure =
  | "RECIPIENT_UNAVAILABLE"
  | "CLIENT_IDENTITY_NOT_FOUND"
  | "STAFF_IDENTITY_NOT_FOUND"
  | "CLERK_USER_NOT_FOUND"
  | "IDENTITY_PROVIDER_TEMPORARY_FAILURE"
  | "NO_VERIFIED_EMAIL"
  | "RECIPIENT_INVALID";
export type RecipientResolution =
  | {
      ok: true;
      email: string;
      source:
        | "CLERK_PRIMARY_VERIFIED"
        | "CLERK_VERIFIED_FALLBACK"
        | "PRE_ACCOUNT_SNAPSHOT";
    }
  | { ok: false; code: RecipientFailure; retryable: boolean };

export function verifiedRecipient(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: {
    id: string;
    emailAddress: string;
    verification: { status: string } | null;
  }[];
}): RecipientResolution {
  const verified = (item: (typeof user.emailAddresses)[number]) =>
    item.verification?.status === "verified" &&
    Boolean(normalizeMailbox(item.emailAddress));
  const primary = user.emailAddresses.find(
    (item) => item.id === user.primaryEmailAddressId && verified(item),
  );
  const fallback = user.emailAddresses.find(verified);
  const value = normalizeMailbox((primary ?? fallback)?.emailAddress ?? "");
  return value
    ? {
        ok: true,
        email: value,
        source: primary ? "CLERK_PRIMARY_VERIFIED" : "CLERK_VERIFIED_FALLBACK",
      }
    : { ok: false, code: "NO_VERIFIED_EMAIL", retryable: false };
}

export async function resolveClerkEmail(
  clerkUserId: string,
): Promise<RecipientResolution> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const user = await Promise.race([
      clerkClient().then((client) => client.users.getUser(clerkUserId)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Identity lookup timed out.")),
          5_000,
        );
      }),
    ]);
    return verifiedRecipient(user);
  } catch (error) {
    const absent =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      error.status === 404;
    return {
      ok: false,
      code: absent
        ? "CLERK_USER_NOT_FOUND"
        : "IDENTITY_PROVIDER_TEMPORARY_FAILURE",
      retryable: !absent,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveEmailRecipient(input: {
  type: "CLIENT" | "STAFF" | "PRE_ACCOUNT";
  reference?: string | null;
  snapshotEmail?: string | null;
}): Promise<RecipientResolution> {
  if (input.type === "PRE_ACCOUNT" || input.snapshotEmail) {
    const value = normalizeMailbox(input.snapshotEmail ?? "");
    return value
      ? { ok: true, email: value, source: "PRE_ACCOUNT_SNAPSHOT" }
      : { ok: false, code: "RECIPIENT_INVALID", retryable: false };
  }
  if (!input.reference)
    return { ok: false, code: "RECIPIENT_UNAVAILABLE", retryable: false };
  const db = getDb();
  if (input.type === "CLIENT") {
    const profile = (
      await db
        .select({ clerkUserId: clientProfiles.clerkUserId })
        .from(clientProfiles)
        .where(eq(clientProfiles.clientReference, input.reference))
        .limit(1)
    )[0];
    return profile
      ? resolveClerkEmail(profile.clerkUserId)
      : { ok: false, code: "CLIENT_IDENTITY_NOT_FOUND", retryable: false };
  }
  const staff = (
    await db
      .select({
        clerkUserId: staffUsers.clerkUserId,
        status: staffUsers.status,
      })
      .from(staffUsers)
      .where(eq(staffUsers.staffReference, input.reference))
      .limit(1)
  )[0];
  return staff?.status === "ACTIVE"
    ? resolveClerkEmail(staff.clerkUserId)
    : { ok: false, code: "STAFF_IDENTITY_NOT_FOUND", retryable: false };
}
