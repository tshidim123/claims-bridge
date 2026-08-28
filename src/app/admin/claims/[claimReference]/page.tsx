import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminClaimControls } from "@/components/admin/admin-claim-controls";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminWorkflowControls } from "@/components/admin/admin-workflow-controls";
import { AdminClientActionCreate, AdminClientActionList } from "@/components/admin/admin-client-action-operations";
import { operationalPriorityLabels } from "@/config/admin-claims";
import { isTerminalClaimStatus } from "@/config/claim-statuses";
import { getAdminClaimWorkspace, getAssignableStaffForClaims } from "@/lib/admin/claims/repository";
import { requirePermission } from "@/lib/staff/authorization";

export const metadata = { title: "Claim workspace", robots: { index: false, follow: false } };

export default async function AdminClaimWorkspacePage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  try {
    await requirePermission(userId, "CLAIMS_VIEW");
  } catch {
    return <AdminAccessDenied forbidden />;
  }
  let workspace;
  try {
    workspace = await getAdminClaimWorkspace(userId, claimReference);
  } catch {
    return <div className="admin-page"><AdminPageHeader eyebrow="Operations / claim" title="This claim is temporarily unavailable." description="The claim workspace could not be loaded. No operational change has been made." /></div>;
  }
  if (!workspace) notFound();
  const canManage = workspace.permissions.includes("CLAIMS_MANAGE");
  const canTransition = workspace.permissions.includes("CLAIMS_TRANSITION_STATUS");
  const assignable = canManage ? await getAssignableStaffForClaims(userId).catch(() => ({ staff: [] })) : { staff: [] };
  const latestNote = workspace.notes.at(-1);
  const reference = encodeURIComponent(workspace.claim.claimReference);

  return <div className="admin-page admin-case-workspace">
    <AdminPageHeader eyebrow="Operations / claim workspace" title={workspace.claim.claimReference} description="Internal operational view of a Claims Bridge claim. Client-facing status and staff workflow controls are intentionally kept distinct." />
    <div className="admin-case-context">
      <span><small>Status</small><strong>{workspace.claim.statusLabel}</strong></span>
      <span><small>Stage</small><strong>{workspace.claim.stageLabel}</strong></span>
      <span><small>Waiting on</small><strong>{workspace.claim.waitingOnLabel}</strong></span>
      <span><small>Priority</small><strong>{operationalPriorityLabels[workspace.claim.priority]}</strong></span>
      <span><small>Assignee</small><strong>{workspace.assignment?.displayName ?? "Unassigned"}</strong></span>
      <span><small>Created</small><strong>{new Date(workspace.claim.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</strong></span>
    </div>
    {canManage && <AdminClaimControls claimReference={workspace.claim.claimReference} currentPriority={workspace.claim.priority} currentStaffReference={workspace.assignment?.staffReference ?? null} assignableStaff={assignable.staff} />}
    {canTransition && <AdminWorkflowControls claimReference={workspace.claim.claimReference} currentStatus={workspace.claim.status} allowedTransitions={workspace.claim.allowedTransitions} />}
    <section className="admin-case-grid" aria-label="Claim operational summary">
      <article className="admin-case-panel admin-case-panel--primary"><p className="eyebrow">Client context</p><h2>{workspace.client.name}</h2><p>Profile status: {workspace.client.profileStatus.toLowerCase().replaceAll("_", " ")}. Basic identity is shown here for operational context.</p><Link className="text-link" href={`/admin/claims/${reference}/client`}>Open client view <span aria-hidden="true">↗</span></Link></article>
      <article className="admin-case-panel"><p className="eyebrow">Evidence posture</p><h2>{workspace.evidence.summary.actionRequiredCount > 0 ? `${workspace.evidence.summary.actionRequiredCount} needs attention` : workspace.evidence.summary.requestedCount ? `${workspace.evidence.summary.requestedCount} requested` : "No current request"}</h2><p>{workspace.evidence.summary.providedCount} provided · {workspace.evidence.summary.acceptedCount} recorded as accepted · {workspace.evidence.summary.underReviewCount} under review.</p><Link className="text-link" href={`/admin/claims/${reference}/evidence`}>View evidence summary <span aria-hidden="true">↗</span></Link></article>
      <article className="admin-case-panel"><p className="eyebrow">Correspondence</p><h2>{workspace.messages[0]?.messageCount ?? 0} messages</h2><p>{workspace.messages[0]?.status === "CLOSED" ? "Conversation closed." : "Client-visible correspondence is read-only in this phase."}</p><Link className="text-link" href={`/admin/claims/${reference}/messages`}>View messages <span aria-hidden="true">↗</span></Link></article>
    </section>
    <section className="admin-case-ledger" aria-labelledby="admin-latest-activity-title"><div className="admin-section__heading"><div><p className="eyebrow">Client-visible record</p><h2 id="admin-latest-activity-title">Latest timeline activity</h2></div><Link className="text-link" href={`/admin/claims/${reference}/timeline`}>Open timeline <span aria-hidden="true">↗</span></Link></div>{workspace.timeline.at(-1) ? <div className="admin-ledger-highlight"><time dateTime={workspace.timeline.at(-1)!.occurredAt}>{new Date(workspace.timeline.at(-1)!.occurredAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time><div><strong>{workspace.timeline.at(-1)!.title}</strong><p>{workspace.timeline.at(-1)!.description}</p></div></div> : <p className="admin-muted-note">No client-visible timeline activity has been recorded.</p>}</section>
    <section className="admin-case-ledger" aria-labelledby="admin-latest-note-title"><div className="admin-section__heading"><div><p className="eyebrow">Staff-only record</p><h2 id="admin-latest-note-title">Latest internal note</h2></div><Link className="text-link" href={`/admin/claims/${reference}/notes`}>Open notes <span aria-hidden="true">↗</span></Link></div>{latestNote ? <div className="admin-note-preview"><span>{latestNote.authorName ?? "Claims Bridge staff"} · {new Date(latestNote.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span><p>{latestNote.body}</p></div> : <p className="admin-muted-note">No internal notes have been added.</p>}</section>
    <AdminClientActionList claimReference={workspace.claim.claimReference} actions={workspace.actions} canManage={canManage} />
    {canManage && !isTerminalClaimStatus(workspace.claim.status) && <AdminClientActionCreate claimReference={workspace.claim.claimReference} />}
    <section className="admin-case-linked"><p className="eyebrow">Read-only linked areas</p><div><Link href={`/admin/claims/${reference}/assessment`}>Assessment</Link><Link href={`/admin/claims/${reference}/documents`}>Documents ({workspace.documents.length})</Link><Link href={`/admin/claims/${reference}/audit`}>Claim audit</Link></div></section>
  </div>;
}
