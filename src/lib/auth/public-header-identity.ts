import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { communicationPreviewEnabled } from "@/lib/communications/preview";

import { getClientProfileSummaryByClerkId, getProfileCompletion } from "@/lib/clients/repository";

export type PublicHeaderIdentity = {
  isAuthenticated: boolean;
  profileComplete: boolean;
  displayName: string | null;
  email: string | null;
  imageUrl: string | null;
  initials: string;
};

const signedOutIdentity: PublicHeaderIdentity = {
  isAuthenticated: false,
  profileComplete: false,
  displayName: null,
  email: null,
  imageUrl: null,
  initials: "",
};

function initialsFor(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  return (parts[0]?.[0] ?? "A").toUpperCase();
}

export async function resolvePublicHeaderIdentity(): Promise<PublicHeaderIdentity> {
  // Next may render the root not-found shell alongside a preview. It must stay identity-free too.
  // This affects public-header presentation only; protected resources always authorize independently.
  if (communicationPreviewEnabled(process.env) && (await headers()).get("x-claims-bridge-preview") === "1") return signedOutIdentity;
  const { userId } = await auth();
  if (!userId) return signedOutIdentity;

  const [user, profile] = await Promise.all([
    currentUser().catch(() => null),
    getClientProfileSummaryByClerkId(userId).catch(() => undefined),
  ]);
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? null;
  const completion = profile ? getProfileCompletion(profile) : null;
  const profileComplete = Boolean(completion && completion.complete === completion.total);
  const displayName = profileComplete && profile ? `${profile.firstName} ${profile.lastName}`.trim() : null;
  const initials = initialsFor(displayName ?? email ?? "Account");

  return { isAuthenticated: true, profileComplete, displayName, email, imageUrl: user?.imageUrl ?? null, initials };
}
