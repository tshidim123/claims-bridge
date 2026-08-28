import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { documentCategoryConfig, documentSecurityStatusLabels, documentStatusLabels } from "@/config/evidence";
import { AdminDocumentReviewControls } from "@/components/admin/admin-document-operations";
import { getAdminClaimWorkspace } from "@/lib/admin/claims/repository";

export default async function AdminClaimDocumentsPage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let workspace;
  try { workspace = await getAdminClaimWorkspace(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  if (!workspace) notFound();
  if (!workspace.permissions.includes("DOCUMENTS_VIEW")) return <AdminAccessDenied forbidden />;
  const canReview = workspace.permissions.includes("DOCUMENTS_REVIEW");
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / documents" title="Document metadata and review state." description="Metadata is available in context. Review actions remain gated by secure binary access and technical validation; storage keys and download URLs are never exposed." />{workspace.documents.length > 0 ? <ul className="admin-document-list" aria-label="Claim document metadata">{workspace.documents.map((document) => <li key={document.documentReference ?? `${document.displayName}-${document.createdAt}`}><div><strong>{document.displayName}</strong><span>{documentCategoryConfig[document.category].label}</span></div><div><span>{documentSecurityStatusLabels[document.securityStatus]}</span><span>{documentStatusLabels[document.status]}</span><time dateTime={document.uploadedAt ?? document.createdAt}>{new Date(document.uploadedAt ?? document.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</time></div>{canReview && <AdminDocumentReviewControls claimReference={workspace.claim.claimReference} documentReference={document.documentReference} status={document.status} securityStatus={document.securityStatus} reviewAvailable={workspace.documentReviewAvailable} />}</li>)}</ul> : <div className="admin-empty admin-empty--large"><h2>No document metadata.</h2><p>No document records are currently linked to this claim.</p></div>}</div>;
}
