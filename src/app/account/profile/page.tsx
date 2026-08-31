import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClientProfileForm } from "@/components/account/client-profile-form";
import { GlassSurface } from "@/components/glass/glass-surface";
import { getClientProfileByClerkId } from "@/lib/clients/repository";

export const metadata = { title: "Profile" };

export default async function AccountProfilePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Fprofile");
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Profile unavailable" description="Your profile is temporarily unavailable while database configuration is completed." /></div>;
  const profile = await getClientProfileByClerkId(userId).catch(() => undefined);
  if (!profile) redirect("/account/onboarding");
  return <div className="account-page"><AccountPageHeader title="Your profile" description="Keep the Claims Bridge contact details used for your case records up to date. Your sign-in identity remains managed by Clerk." /><GlassSurface strength="medium"><div className="account-profile-panel"><p className="eyebrow">Client details</p><h2>Profile information</h2><ClientProfileForm profile={profile} /></div></GlassSurface></div>;
}
