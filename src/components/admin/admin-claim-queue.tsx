import Link from "next/link";

import { operationalPriorityLabels } from "@/config/admin-claims";
import type { AdminQueueResult, ClaimQueueFilters } from "@/lib/admin/claims/repository";

function queueHref(filters: ClaimQueueFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assignment && filters.assignment !== "ALL") params.set("assignment", filters.assignment);
  if (filters.waitingOn) params.set("waitingOn", filters.waitingOn);
  if (filters.evidenceAttention !== undefined) params.set("evidence", filters.evidenceAttention ? "yes" : "no");
  if (filters.archive && filters.archive !== "ACTIVE") params.set("archive", filters.archive);
  if (filters.sort) params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/admin/claims${query ? `?${query}` : ""}`;
}

export function AdminClaimQueue({ result, filters }: { result: AdminQueueResult; filters: ClaimQueueFilters }) {
  if (result.items.length === 0) return <section className="admin-queue-empty" aria-labelledby="claims-empty-title"><p className="eyebrow">No matching claims</p><h2 id="claims-empty-title">The queue is clear for this view.</h2><p>No real claim records match the current search and filters.</p></section>;
  return <section className="admin-queue" aria-labelledby="claims-results-title">
    <div className="admin-queue-heading"><div><p className="eyebrow">Claim records</p><h2 id="claims-results-title">Showing {result.items.length} of {result.total}</h2></div><span>Page {result.page}</span></div>
    <ol className="admin-claim-list">{result.items.map((item) => <li key={item.claimReference}><Link href={`/admin/claims/${encodeURIComponent(item.claimReference)}`} className={`admin-claim-row admin-claim-row--${item.priority.toLowerCase()}`}>
      <div className="admin-claim-row__identity"><span className="admin-claim-row__rail" aria-hidden="true" /><strong>{item.claimReference}</strong><span>{item.clientName}</span></div>
      <div className="admin-claim-row__state"><span className="admin-state-label">{item.archivedAt ? "Archived" : item.statusLabel}</span><span>{item.archivedAt ? `Archived ${new Date(item.archivedAt).toLocaleDateString("en-GB")}` : `${item.stageLabel} · ${item.waitingOnLabel}`}</span></div>
      <div className="admin-claim-row__context"><span><small>Priority</small><b>{operationalPriorityLabels[item.priority]}</b></span><span><small>Assignment</small><b>{item.assignedTo?.displayName ?? "Unassigned"}</b></span><span><small>Evidence</small><b>{item.evidence.actionRequiredCount > 0 ? `${item.evidence.actionRequiredCount} needs attention` : item.evidence.requestedCount ? `${item.evidence.requestedCount} requested` : "No current request"}</b></span><span><small>Client actions</small><b>{item.openActionCount > 0 ? `${item.openActionCount} outstanding` : "None outstanding"}</b></span><span><small>Activity</small><b>{new Date(item.latestActivityAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</b></span></div>
      <div className="admin-claim-row__flags">{item.archivedAt ? <span>Archived workflow</span> : <>{item.unreadMessageCount > 0 && <span>{item.unreadMessageCount} unread client message{item.unreadMessageCount === 1 ? "" : "s"}</span>}{item.evidence.actionRequiredCount > 0 && <span>Evidence attention</span>}{item.openActionCount > 0 && <span>Client action outstanding</span>}</>}<span aria-hidden="true">→</span></div>
    </Link></li>)}</ol>
    <nav className="admin-pagination" aria-label="Claims pages">{result.hasPreviousPage ? <Link className="button button--small button--quiet" href={queueHref(filters, result.page - 1)}>Previous</Link> : <span />}{result.hasNextPage ? <Link className="button button--small button--quiet" href={queueHref(filters, result.page + 1)}>Next page</Link> : <span />}</nav>
  </section>;
}
