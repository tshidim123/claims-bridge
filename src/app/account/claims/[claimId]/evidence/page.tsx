import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { EvidenceRequirementList } from "@/components/evidence/evidence-requirement-list";
import { EvidenceSummary } from "@/components/evidence/evidence-summary";
import { ClaimReference } from "@/components/claims/claim-status";
import { getClaimEvidenceWorkspaceForClient } from "@/lib/evidence/repository";

export const metadata = { title: "Claim evidence" };

export default async function ClaimEvidencePage({ params }: { params: Promise<{ claimId: string }> }) {
  const { userId } = await auth();
  const { claimId } = await params;
  if (!userId || !process.env.DATABASE_URL) notFound();
  let workspace;
  try {
    workspace = await getClaimEvidenceWorkspaceForClient(userId, claimId);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Evidence unavailable" description="This evidence workspace is temporarily unavailable. Please try again shortly." /></div>;
  }
  if (!workspace) notFound();

  return (
    <div className="account-page evidence-page">
      <AccountPageHeader eyebrow="Your Claims Bridge claim" title="Evidence" description="Review the supporting information currently requested for this claim. A request is a workflow step, not a conclusion about the claim." />
      <div className="evidence-page__reference"><ClaimReference reference={workspace.claim.claimReference} /><span>Evidence workspace</span></div>
      <EvidenceSummary summary={workspace.summary} />
      {workspace.requirements.length === 0 ? <section className="evidence-empty" aria-labelledby="evidence-empty-title"><p className="eyebrow">No current requests</p><h2 id="evidence-empty-title">No evidence has been requested from you at this stage.</h2><p>Claims Bridge may request supporting information as the claim progresses. Nothing is required from you here until a specific request appears.</p></section> : <EvidenceRequirementList requirements={workspace.requirements} documents={workspace.documents} claimReference={workspace.claim.claimReference} />}
      <section className="evidence-guidance" aria-labelledby="evidence-guidance-title"><p className="eyebrow">A note on evidence</p><h2 id="evidence-guidance-title">Missing a document does not by itself determine the outcome.</h2><p>Evidence is considered alongside the wider claim record. Further assessment may be required as the workflow develops.</p></section>
    </div>
  );
}
