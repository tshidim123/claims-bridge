import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimReference, ClaimStagePath, ClaimStatus } from "@/components/claims/claim-status";
import { GlassSurface } from "@/components/glass/glass-surface";
import { getPreliminaryOutcomeLabel } from "@/config/claim-tracking";
import { getClaimForClient } from "@/lib/claims/repository";

export const metadata = { title: "Claim details" };

export default async function ClaimDetailsPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { userId } = await auth();
  const { claimId } = await params;
  if (!userId || !process.env.DATABASE_URL) notFound();

  let owned;
  try {
    owned = await getClaimForClient(userId, claimId);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Claim details unavailable" description="These claim details are temporarily unavailable. Please try again shortly." /></div>;
  }
  if (!owned) notFound();

  return (
    <div className="account-page claim-page">
      <AccountPageHeader eyebrow="Claim workspace" title="Claim details" description="The information below describes this Claims Bridge workflow record. It is not a legal conclusion or a guarantee of an outcome." />
      <GlassSurface className="claim-details-panel" strength="medium">
        <div className="claim-details-panel__top"><ClaimReference reference={owned.claim.claimReference} /><ClaimStatus status={owned.claim.status} /></div>
        <div className="claim-details-grid"><div><span>Current stage</span><ClaimStagePath status={owned.claim.status} /></div><div><span>Date created</span><strong>{owned.claim.createdAt.toLocaleDateString("en-GB")}</strong></div><div><span>Date submitted</span><strong>{owned.claim.submittedAt?.toLocaleDateString("en-GB") ?? "Not submitted"}</strong></div><div><span>Originating assessment</span><strong>{owned.assessment?.completedAt ? `Completed ${owned.assessment.completedAt.toLocaleDateString("en-GB")}` : "Saved preliminary assessment"}</strong></div><div><span>Preliminary outcome</span><strong>{getPreliminaryOutcomeLabel(owned.assessment?.preliminaryOutcome)}</strong></div></div>
      </GlassSurface>
    </div>
  );
}
