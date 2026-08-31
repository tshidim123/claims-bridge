import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminClientActionCreate, AdminClientActionList } from "@/components/admin/admin-client-action-operations";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminClaimWorkspace } from "@/lib/admin/claims/repository";
import { requirePermission } from "@/lib/staff/authorization";

export const metadata = { title: "Claim client actions", robots: { index: false, follow: false } };

export default async function AdminClaimClientActionsPage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { userId } = await auth(); if (!userId) return <AdminAccessDenied />;
  try { await requirePermission(userId, "CLAIMS_VIEW"); } catch { return <AdminAccessDenied forbidden />; }
  const { claimReference } = await params; const workspace = await getAdminClaimWorkspace(userId, claimReference).catch(() => undefined); if (!workspace) notFound();
  const canManage = workspace.permissions.includes("CLAIMS_MANAGE") && !workspace.claim.archivedAt;
  return <div className="admin-page"><AdminPageHeader eyebrow="Operations / claim / client actions" title={workspace.claim.claimReference} description="Controlled client actions are separate from evidence and messages. They appear in the client workspace through the same persisted requirement records." /><AdminClientActionList claimReference={workspace.claim.claimReference} actions={workspace.actions} canManage={canManage} />{canManage && <AdminClientActionCreate claimReference={workspace.claim.claimReference} />}{workspace.claim.archivedAt && <section className="admin-deferred-notice"><div><strong>Archived claim</strong><p>Client actions remain historical until this claim is restored through the authorised archive control.</p></div></section>}</div>;
}
