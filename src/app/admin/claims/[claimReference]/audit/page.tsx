import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AuditEventRow } from "@/components/admin/audit-event-row";
import { getAdminClaimAudit, getAdminClaimWorkspace } from "@/lib/admin/claims/repository";

export default async function AdminClaimAuditPage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let workspace;
  try { workspace = await getAdminClaimWorkspace(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  if (!workspace) notFound();
  if (!workspace.permissions.includes("AUDIT_VIEW")) return <AdminAccessDenied forbidden />;
  const audit = await getAdminClaimAudit(userId, claimReference);
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / audit" title="The claim’s operational trail." description="Recorded staff actions are append-oriented and shown as safe summaries." />{audit.events.length > 0 ? <ol className="admin-audit-list" aria-label="Claim audit events">{audit.events.map((event, index) => <AuditEventRow event={event} key={`${event.createdAt}-${index}`} />)}</ol> : <div className="admin-empty admin-empty--large"><h2>No claim audit events.</h2><p>No staff actions have been recorded for this claim.</p></div>}</div>;
}
