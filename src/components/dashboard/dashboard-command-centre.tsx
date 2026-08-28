import Link from "next/link";
import type { CSSProperties } from "react";

import { claimStageConfig } from "@/config/claim-statuses";
import { ClaimReference, ClaimStatus } from "@/components/claims/claim-status";
import { GlassSurface } from "@/components/glass/glass-surface";
import type { DashboardViewModel } from "@/lib/dashboard/service";

function dateLabel(value: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

export function DashboardCommandCentre({ dashboard }: { dashboard: DashboardViewModel }) {
  const greeting = dashboard.client?.firstName ? `Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${dashboard.client.firstName}.` : "Your Claims Bridge workspace.";
  const featuredClaim = dashboard.primaryAction.claimReference ? dashboard.activeClaims.find((claim) => claim.claimReference === dashboard.primaryAction.claimReference) : dashboard.activeClaims[0];

  return (
    <div className="account-page dashboard-page">
      <header className="dashboard-command-header">
        <div className="dashboard-command-header__copy"><p className="eyebrow">Claims Bridge command centre</p><h1>{greeting}</h1><p>One clear view of what needs your attention, what has changed and where your case is moving next.</p></div>
        <GlassSurface className="dashboard-command-header__action" strength="strong"><div className="glass-surface__content"><p className="eyebrow">Next move</p><h2>{dashboard.primaryAction.label}</h2><p>{dashboard.primaryAction.description}</p>{dashboard.primaryAction.destination ? <Link className="button button--primary button--medium" href={dashboard.primaryAction.destination}><span className="button__label">{dashboard.primaryAction.label}<span aria-hidden="true">→</span></span></Link> : <span className="dashboard-command-header__calm">No immediate action required</span>}</div></GlassSurface>
      </header>

      <section className="dashboard-metric-strip" aria-label="Workspace summary">
        <div><span>Active claims</span><strong>{dashboard.summaries.activeClaims}</strong></div>
        <div className={dashboard.summaries.actionsRequired > 0 ? "is-attention" : ""}><span>Needs attention</span><strong>{dashboard.summaries.actionsRequired}</strong></div>
        <div><span>Unread messages</span><strong>{dashboard.summaries.unreadMessages}</strong></div>
        <div><span>Unread notifications</span><strong>{dashboard.summaries.unreadNotifications}</strong></div>
      </section>

      {dashboard.attentionItems.length > 0 ? <section className="dashboard-attention" aria-labelledby="dashboard-attention-title"><div className="dashboard-section-heading"><div><p className="eyebrow">Priority rail</p><h2 id="dashboard-attention-title">Needs your attention</h2></div><span>Ordered by action value, not recency alone.</span></div><div className="dashboard-attention__list">{dashboard.attentionItems.map((item) => <Link className="dashboard-attention__item" href={item.destination ?? "/account/notifications"} key={`${item.kind}-${item.claimReference ?? "account"}-${item.title}`}><span className="dashboard-attention__index">{String(item.priority).padStart(2, "0")}</span><span><strong>{item.title}</strong><small>{item.context}</small><em>{item.description}</em></span><span className="dashboard-attention__arrow" aria-hidden="true">→</span></Link>)}</div></section> : <section className="dashboard-calm-state" aria-labelledby="dashboard-calm-title"><p className="eyebrow">Clear route</p><h2 id="dashboard-calm-title">Nothing needs your attention right now.</h2><p>Claims Bridge will keep meaningful changes in your Notification Centre and claim timeline.</p></section>}

      {featuredClaim ? <ActiveClaimArea claim={featuredClaim} activeClaims={dashboard.activeClaims} /> : <NoClaimArea dashboard={dashboard} />}

      {featuredClaim && <div className="dashboard-support-grid"><EvidencePanel claim={featuredClaim} /><CommunicationPanel dashboard={dashboard} /></div>}

      {dashboard.recentActivity.length > 0 && <section className="dashboard-activity" aria-labelledby="dashboard-activity-title"><div className="dashboard-section-heading"><div><p className="eyebrow">Operational ledger</p><h2 id="dashboard-activity-title">Recent activity</h2></div><Link className="text-link" href={featuredClaim ? `/account/claims/${encodeURIComponent(featuredClaim.claimReference)}/timeline` : "/account/notifications"}>Open full history <span aria-hidden="true">→</span></Link></div><ol className="dashboard-activity__list">{dashboard.recentActivity.map((activity) => <li key={`${activity.occurredAt}-${activity.title}-${activity.claimReference}`}><time dateTime={activity.occurredAt}>{timeLabel(activity.occurredAt)}</time><div><strong>{activity.title}</strong>{activity.claimReference && <ClaimReference reference={activity.claimReference} />}<p>{activity.description}</p></div>{activity.destination && <Link className="text-link" href={activity.destination}>View <span aria-hidden="true">→</span></Link>}</li>)}</ol></section>}

      {dashboard.terminalClaimCount > 0 && <p className="dashboard-history-note">{dashboard.terminalClaimCount} previous claim record{dashboard.terminalClaimCount === 1 ? "" : "s"} remain available in <Link href="/account/claims">My Claims</Link>.</p>}
    </div>
  );
}

function ActiveClaimArea({ claim, activeClaims }: { claim: DashboardViewModel["activeClaims"][number]; activeClaims: DashboardViewModel["activeClaims"] }) {
  return <section className="dashboard-claims" aria-labelledby="dashboard-claims-title"><div className="dashboard-section-heading"><div><p className="eyebrow">Case portfolio</p><h2 id="dashboard-claims-title">Active Claims</h2></div><Link className="text-link" href="/account/claims">View all claims <span aria-hidden="true">→</span></Link></div><GlassSurface className="dashboard-featured-claim" strength="strong"><div className="glass-surface__content"><div className="dashboard-featured-claim__top"><div><ClaimReference reference={claim.claimReference} /><h3>{claim.statusLabel}</h3><p>{claim.nextStep.explanation}</p></div><ClaimStatus status={claim.status} /></div><CompactStagePath claim={claim} /><div className="dashboard-featured-claim__footer"><span><small>Waiting on</small><strong>{claim.waitingOn}</strong></span><span><small>Created</small><strong>{dateLabel(claim.createdAt)}</strong></span><span><small>Latest activity</small><strong>{dateLabel(claim.latestActivityAt)}</strong></span><Link className="button button--secondary button--small" href={`/account/claims/${encodeURIComponent(claim.claimReference)}`}><span className="button__label">Open claim <span aria-hidden="true">→</span></span></Link></div></div></GlassSurface>{activeClaims.length > 1 && <div className="dashboard-claim-rail">{activeClaims.slice(0, 3).map((item) => <Link className={item.claimReference === claim.claimReference ? "is-selected" : ""} href={`/account/claims/${encodeURIComponent(item.claimReference)}`} key={item.claimReference}><ClaimReference reference={item.claimReference} /><span>{item.statusLabel}</span>{item.unreadMessageCount > 0 && <b>{item.unreadMessageCount} unread</b>}</Link>)}</div>}</section>;
}

function CompactStagePath({ claim }: { claim: DashboardViewModel["activeClaims"][number] }) {
  return <ol className="dashboard-stage-path" style={{ "--stage-progress": claim.stageOrder } as CSSProperties} aria-label={`Claim stage ${claim.stageOrder} of ${claim.stageCount}`}>
    {claimStageConfig.map((stage) => <li className={stage.order < claim.stageOrder ? "is-complete" : stage.order === claim.stageOrder ? "is-current" : "is-upcoming"} aria-current={stage.order === claim.stageOrder ? "step" : undefined} key={stage.id}><span>{String(stage.order).padStart(2, "0")}</span><strong>{stage.label}</strong></li>)}
  </ol>;
}

function EvidencePanel({ claim }: { claim: DashboardViewModel["activeClaims"][number] }) {
  return <section className="dashboard-evidence" aria-labelledby="dashboard-evidence-title"><div className="dashboard-section-heading"><div><p className="eyebrow">Evidence position</p><h2 id="dashboard-evidence-title">{claim.evidence.completenessState === "NOT_STARTED" ? "No evidence requested" : claim.evidence.completenessState.replaceAll("_", " ")}</h2></div><Link className="text-link" href={`/account/claims/${encodeURIComponent(claim.claimReference)}/evidence`}>Open evidence <span aria-hidden="true">→</span></Link></div><p>Evidence completeness describes currently requested supporting information. It is not a measure of claim success.</p><div className="dashboard-evidence__counts"><span><strong>{claim.evidence.requestedCount}</strong> requested</span><span><strong>{claim.evidence.providedCount}</strong> provided</span><span><strong>{claim.evidence.underReviewCount}</strong> under review</span><span className={claim.evidence.actionRequiredCount > 0 ? "is-attention" : ""}><strong>{claim.evidence.actionRequiredCount}</strong> needs attention</span></div></section>;
}

function CommunicationPanel({ dashboard }: { dashboard: DashboardViewModel }) {
  return <section className="dashboard-communication" aria-labelledby="dashboard-communication-title"><div className="dashboard-section-heading"><div><p className="eyebrow">Correspondence & notices</p><h2 id="dashboard-communication-title">Keep in view</h2></div></div><div className="dashboard-communication__rows"><Link href="/account/messages"><span className="eyebrow">Messages</span><strong>{dashboard.messages.unreadCount > 0 ? `${dashboard.messages.unreadCount} unread` : "No unread messages"}</strong><small>{dashboard.messages.latestIncoming ? `Latest incoming message · ${dashboard.messages.latestIncoming.claimReference}` : "Private claim correspondence"}</small></Link><Link href="/account/notifications"><span className="eyebrow">Notifications</span><strong>{dashboard.notifications.unreadCount > 0 ? `${dashboard.notifications.unreadCount} unread` : "All caught up"}</strong><small>{dashboard.notifications.latestImportant ? dashboard.notifications.latestImportant.title : "Meaningful account and claim changes"}</small></Link></div></section>;
}

function NoClaimArea({ dashboard }: { dashboard: DashboardViewModel }) {
  const copy = dashboard.terminalClaimCount > 0 ? { eyebrow: "Claim history", title: "Your current workspace has no active claims.", description: "Previous claim records remain available in My Claims for your reference.", href: "/account/claims", label: "View claim history" } : dashboard.assessment.state === "COMPLETE" ? { eyebrow: "Assessment ready", title: "Your preliminary assessment is ready to review.", description: "Review the saved result, then choose explicitly whether to continue to claim review.", href: "/account/assessment", label: "Review assessment" } : dashboard.assessment.state === "INCOMPLETE" ? { eyebrow: "Saved route", title: "Continue your saved assessment.", description: "Pick up where you left off when you are ready. A claim is created only after an explicit decision to proceed.", href: "/account/assessment", label: "Continue assessment" } : { eyebrow: "Start here", title: "Begin with a preliminary eligibility assessment.", description: "Claims Bridge will guide you through the initial questions before you decide whether to create a claim record.", href: "/check-eligibility", label: "Check eligibility" };
  return <section className="dashboard-onboarding" aria-labelledby="dashboard-onboarding-title"><div><p className="eyebrow">{copy.eyebrow}</p><h2 id="dashboard-onboarding-title">{copy.title}</h2><p>{copy.description}</p><Link className="button button--primary button--medium" href={copy.href}><span className="button__label">{copy.label}<span aria-hidden="true">→</span></span></Link></div><div className="dashboard-onboarding__route" aria-hidden="true"><span>01</span><span>02</span><span>03</span></div></section>;
}
