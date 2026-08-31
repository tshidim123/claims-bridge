import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimWaitingState } from "@/components/claims/claim-next-step";
import { ClaimStagePath, ClaimStatus, ClaimReference } from "@/components/claims/claim-status";
import { getClaimsForClient } from "@/lib/claims/repository";
import { getEvidenceActionCountsForClient } from "@/lib/evidence/repository";
import { getMessageIndexForClient } from "@/lib/messaging/repository";

export const metadata = { title: "My claims" };

export default async function AccountClaimsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Fclaims");
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="My Claims" description="Your claim index is temporarily unavailable while database configuration is completed." /></div>;

  let claims;
  let evidenceActionCounts: Record<string, number> = {};
  let messageUnreadCounts: Record<string, number> = {};
  try {
    claims = await getClaimsForClient(userId);
    evidenceActionCounts = await getEvidenceActionCountsForClient(userId);
    messageUnreadCounts = Object.fromEntries((await getMessageIndexForClient(userId)).map((item) => [item.conversation.claimId, item.unreadCount]));
  } catch {
    return <div className="account-page"><AccountPageHeader title="My Claims" description="Your claim index is temporarily unavailable. Please try again shortly." /></div>;
  }

  const activeClaims = claims.filter((claim) => !claim.archivedAt);
  const archivedClaims = claims.filter((claim) => claim.archivedAt);

  if (activeClaims.length === 0 && archivedClaims.length === 0) {
    return (
      <div className="account-page">
        <AccountPageHeader title="My Claims" description="A secure place to follow Claims Bridge case records you have explicitly chosen to create." />
        <section className="account-empty claim-empty glass-surface glass-surface--medium" aria-labelledby="claims-empty-title">
          <div className="glass-surface__content account-empty__content">
            <span className="account-empty__symbol" aria-hidden="true">↗</span>
            <div><p className="eyebrow">No claim records yet</p><h2 id="claims-empty-title">You don&apos;t have an active Claims Bridge claim yet.</h2><p>Start with a preliminary eligibility assessment. You decide separately whether to continue and create a claim record.</p></div>
            <div className="claim-empty__actions"><Link className="button button--primary button--medium" href="/check-eligibility"><span className="button__label">Check eligibility</span></Link><Link className="text-link" href="/account/assessments">Review saved assessments</Link></div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="account-page">
      <AccountPageHeader title="My Claims" description="Your persisted Claims Bridge case records, with the current workflow stage and next known step." />
      <section className="claim-index" aria-labelledby="claim-index-title">
        <div className="claim-index__heading"><div><p className="eyebrow">Your claim index</p><h2 id="claim-index-title">{activeClaims.length} active {activeClaims.length === 1 ? "claim" : "claims"}</h2></div><span className="claim-index__note">Status reflects workflow state, not legal success.</span></div>
        <ol className="claim-index__list">
          {activeClaims.map((claim) => (
            <li key={claim.id}>
              <Link className="claim-card" href={`/account/claims/${encodeURIComponent(claim.claimReference)}`}>
                <div className="claim-card__top"><ClaimReference reference={claim.claimReference} /><ClaimStatus status={claim.status} /></div>
                <ClaimStagePath status={claim.status} />
                {messageUnreadCounts[claim.id] > 0 && <span className="claim-card__attention">{messageUnreadCounts[claim.id]} unread {messageUnreadCounts[claim.id] === 1 ? "message" : "messages"}</span>}
                <div className="claim-card__meta"><span>Created {claim.createdAt.toLocaleDateString("en-GB")}</span>{claim.submittedAt && <span>Submitted {claim.submittedAt.toLocaleDateString("en-GB")}</span>}<ClaimWaitingState status={claim.status} />{evidenceActionCounts[claim.id] > 0 && <span className="claim-card__attention">Evidence action required</span>}<span className="claim-card__action">View claim <span aria-hidden="true">→</span></span></div>
              </Link>
            </li>
          ))}
        </ol>
        {archivedClaims.length > 0 && <section className="claim-history-list" aria-labelledby="archived-claims-title"><p className="eyebrow">Archived history</p><h2 id="archived-claims-title">Retained claim records</h2><p>Archived records are retained for integrity and are not active workflows.</p><ol>{archivedClaims.map((claim) => <li key={claim.id}><Link href={`/account/claims/${encodeURIComponent(claim.claimReference)}`}><ClaimReference reference={claim.claimReference} /><span>Archived {claim.archivedAt?.toLocaleDateString("en-GB")}</span></Link></li>)}</ol></section>}
      </section>
    </div>
  );
}
