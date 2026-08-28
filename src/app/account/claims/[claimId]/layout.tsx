import type { ReactNode } from "react";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimNavigation } from "@/components/navigation/claim-navigation";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { getClaimForClient } from "@/lib/claims/repository";

type ClaimLayoutProps = {
  children: ReactNode;
  params: Promise<{ claimId: string }>;
};

export default async function ClaimLayout({ children, params }: ClaimLayoutProps) {
  const { claimId } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/account/claims/${claimId}`)}`);
  if (!process.env.DATABASE_URL) return <AccountPageHeader title="Claim unavailable" description="This claim workspace is temporarily unavailable while database configuration is completed." />;
  let ownedClaim;
  try {
    ownedClaim = await getClaimForClient(userId, claimId);
  } catch {
    return <AccountPageHeader title="Claim unavailable" description="This claim workspace is temporarily unavailable. Please try again shortly." />;
  }
  if (!ownedClaim) notFound();

  return (
    <div className="claim-workspace">
      <ClaimNavigation claimId={ownedClaim.claim.claimReference} />
      {children}
    </div>
  );
}
