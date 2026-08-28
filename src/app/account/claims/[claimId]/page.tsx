import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { claimStatusConfig, isClaimStatus } from "@/config/claim-statuses";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimNextStep } from "@/components/claims/claim-next-step";
import { ClientActionList } from "@/components/claims/client-action-list";
import { ClaimRecentActivity } from "@/components/claims/claim-recent-activity";
import { ClaimStagePath, ClaimStatus, ClaimReference } from "@/components/claims/claim-status";
import { EvidenceSummary } from "@/components/evidence/evidence-summary";
import { GlassSurface } from "@/components/glass/glass-surface";
import { getClaimForClient, getLatestTimelineEvents } from "@/lib/claims/repository";
import { getClaimEvidenceWorkspaceForClient } from "@/lib/evidence/repository";
import { getClaimMessagingSummaryForClient } from "@/lib/messaging/repository";
import { getClientActionRequirementsForClaim } from "@/lib/actions/repository";

export const metadata = { title: "Claim overview" };

export default async function ClaimOverviewPage({ params }: { params: Promise<{ claimId: string }> }) {
  const { userId } = await auth();
  const { claimId } = await params;
  if (!userId || !process.env.DATABASE_URL) notFound();
  let owned;
  let timeline;
  let evidenceSummary;
  let messagingSummary;
  let actions;
  try {
    owned = await getClaimForClient(userId, claimId);
    if (!owned) notFound();
    timeline = await getLatestTimelineEvents(userId, claimId);
    evidenceSummary = (await getClaimEvidenceWorkspaceForClient(userId, claimId))?.summary;
    messagingSummary = await getClaimMessagingSummaryForClient(userId, claimId);
    actions = await getClientActionRequirementsForClaim(userId, claimId);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Claim unavailable" description="This claim workspace is temporarily unavailable. Please try again shortly." /></div>;
  }
  return (
    <div className="account-page claim-page">
      <AccountPageHeader eyebrow="Your Claims Bridge claim" title="Claim overview" description="This case record reflects your decision to proceed from a preliminary assessment. Further assessment may be required; its existence does not guarantee success or establish liability." />
      <div className="claim-overview__grid">
        <GlassSurface className="claim-overview__primary" strength="strong">
          <ClaimReference reference={owned.claim.claimReference} />
          <div className="claim-overview__status"><span className="eyebrow">Current status</span><ClaimStatus status={owned.claim.status} /><p>{getStatusDescription(owned.claim.status)}</p></div>
          <ClaimStagePath status={owned.claim.status} />
        </GlassSurface>
        <GlassSurface className="claim-overview__details" strength="medium">
          <div className="claim-detail-list"><div><span>Created</span><strong>{owned.claim.createdAt.toLocaleDateString("en-GB")}</strong></div><div><span>Submitted</span><strong>{owned.claim.submittedAt?.toLocaleDateString("en-GB") ?? "Not submitted"}</strong></div><div><span>Preliminary assessment</span><strong>{owned.assessment?.completedAt ? `Completed ${owned.assessment.completedAt.toLocaleDateString("en-GB")}` : "Saved assessment"}</strong></div></div>
          <p className="claim-disclaimer">Claims Bridge workflow status is not a legal conclusion. Additional information may be requested as the review develops.</p>
        </GlassSurface>
      </div>
      <ClaimNextStep status={owned.claim.status} claimReference={owned.claim.claimReference} evidenceActionRequired={Boolean(evidenceSummary?.actionRequiredCount)} />
      <ClientActionList claimReference={owned.claim.claimReference} actions={actions ?? []} />
      {evidenceSummary && <EvidenceSummary summary={evidenceSummary} compact />}
      <section className="claim-message-summary" aria-labelledby="claim-message-summary-title"><div><p className="eyebrow">Correspondence</p><h2 id="claim-message-summary-title">{messagingSummary ? (messagingSummary.unreadCount > 0 ? `${messagingSummary.unreadCount} unread ${messagingSummary.unreadCount === 1 ? "message" : "messages"}` : "No unread messages") : "No conversation yet"}</h2><p>{messagingSummary ? "Messages about this claim are kept in a private correspondence channel." : "Open Messages when you need to share an update about this claim."}</p></div><Link className="text-link" href={`/account/claims/${encodeURIComponent(owned.claim.claimReference)}/messages`}>Open messages <span aria-hidden="true">→</span></Link></section>
      <ClaimRecentActivity events={timeline} />
      <Link className="text-link" href={`/account/claims/${encodeURIComponent(owned.claim.claimReference)}/timeline`}>View claim timeline <span aria-hidden="true">→</span></Link>
    </div>
  );
}

function getStatusDescription(status: string) {
  return isClaimStatus(status) ? claimStatusConfig[status].description : "Your claim status is temporarily unavailable.";
}
