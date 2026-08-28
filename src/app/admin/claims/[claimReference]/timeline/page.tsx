import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminClaimWorkspace } from "@/lib/admin/claims/repository";

export default async function AdminClaimTimelinePage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let workspace;
  try { workspace = await getAdminClaimWorkspace(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  if (!workspace) notFound();
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / timeline" title="Client timeline and workflow history." description="These records remain separate: the client timeline is client-visible activity, while workflow history records status changes." /><section className="admin-ledger-section" aria-labelledby="client-timeline-title"><h2 id="client-timeline-title">Client timeline</h2>{workspace.timeline.length > 0 ? <ol className="admin-operational-ledger">{workspace.timeline.map((event) => <li key={`${event.occurredAt}-${event.title}`}><time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time><div><strong>{event.title}</strong><p>{event.description}</p></div></li>)}</ol> : <p className="admin-muted-note">No client-visible activity has been recorded.</p>}</section><section className="admin-ledger-section" aria-labelledby="workflow-history-title"><h2 id="workflow-history-title">Workflow history</h2>{workspace.statusHistory.length > 0 ? <ol className="admin-operational-ledger">{workspace.statusHistory.map((event, index) => <li key={`${event.createdAt}-${index}`}><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time><div><strong>{event.from ? `${event.from} → ${event.to}` : event.to}</strong><p>Recorded workflow event · actor {event.actorType.toLowerCase()}</p></div></li>)}</ol> : <p className="admin-muted-note">No workflow history has been recorded.</p>}</section></div>;
}
