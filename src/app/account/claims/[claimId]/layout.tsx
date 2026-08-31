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
  if (ownedClaim.claim.archivedAt) {
    return <div className="account-page claim-page"><AccountPageHeader eyebrow="Claim history" title="Claim archived" description="This claim is retained as part of your case history but is no longer an active Claims Bridge workflow." /><section className="document-vault__empty"><p className="eyebrow">Archived {ownedClaim.claim.archivedAt.toLocaleDateString("en-GB")}</p><h2>This claim is read-only.</h2><p>Its history remains retained for operational integrity. It is not shown as an active claim and no new messages, documents, evidence, or actions can be added while archived.</p></section></div>;
  }

  return (
    <div className="claim-workspace">
      <ClaimNavigation claimId={ownedClaim.claim.claimReference} />
      {children}
    </div>
  );
}
