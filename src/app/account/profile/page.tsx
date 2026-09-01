import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClientProfileForm } from "@/components/account/client-profile-form";
import { GlassSurface } from "@/components/glass/glass-surface";
import { getClientProfileByClerkId } from "@/lib/clients/repository";
import { getProfileCompletion } from "@/lib/clients/repository";
import { listProfileShares } from "@/lib/clients/shares";

export const metadata = { title: "Profile" };

export default async function AccountProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Fprofile");
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Profile unavailable" description="Your profile is temporarily unavailable while database configuration is completed." /></div>;
  const profile = await getClientProfileByClerkId(userId).catch(() => undefined);
  if (!profile) redirect("/account/onboarding");
  const [user, shares] = await Promise.all([currentUser(), listProfileShares(userId).catch(() => [])]);
  const completion = getProfileCompletion(profile);
  return <div className="account-page"><AccountPageHeader title="Your profile" description="Your private Claims Bridge identity, contact preferences and basic address are managed separately from tenancy details." /><GlassSurface strength="medium"><div className="account-profile-panel"><p className="eyebrow">Profile setup</p><h2>{completion.complete} of {completion.total} profile sections complete</h2><ClientProfileForm accountEmail={user?.primaryEmailAddress?.emailAddress ?? null} profile={profile} shares={shares.map((share) => ({ ...share, expiresAt: share.expiresAt.toISOString(), revokedAt: share.revokedAt?.toISOString() ?? null }))} /></div></GlassSurface></div>;
}
