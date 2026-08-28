import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { evidenceRequirementConfig, evidenceRequirementStatusLabels } from "@/config/evidence";
import { isTerminalClaimStatus } from "@/config/claim-statuses";
import { AdminEvidenceRequestForm, AdminEvidenceRequirementActions } from "@/components/admin/admin-evidence-operations";
import { getAdminClaimWorkspace } from "@/lib/admin/claims/repository";

export default async function AdminClaimEvidencePage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let workspace;
  try { workspace = await getAdminClaimWorkspace(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  if (!workspace) notFound();
  if (!workspace.permissions.includes("EVIDENCE_VIEW")) return <AdminAccessDenied forbidden />;
  const canRequest = workspace.permissions.includes("EVIDENCE_REQUEST") && !isTerminalClaimStatus(workspace.claim.status);
  const canReview = workspace.permissions.includes("EVIDENCE_REVIEW");
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / evidence" title="Evidence posture and controlled review." description="Client-visible evidence requirements remain separate from claim status. Review actions use the canonical evidence workflow and are permission checked on the server." /><section className="admin-evidence-summary"><span><small>Requested</small><strong>{workspace.evidence.summary.requestedCount}</strong></span><span><small>Provided</small><strong>{workspace.evidence.summary.providedCount}</strong></span><span><small>Under review</small><strong>{workspace.evidence.summary.underReviewCount}</strong></span><span><small>Needs attention</small><strong>{workspace.evidence.summary.actionRequiredCount}</strong></span></section>{canRequest && <AdminEvidenceRequestForm claimReference={workspace.claim.claimReference} />}{workspace.evidence.requirements.length > 0 ? <ol className="admin-requirement-list">{workspace.evidence.requirements.map((item) => <li key={item.requirementReference}><div><strong>{item.title || evidenceRequirementConfig[item.type].label}</strong><p>{item.description}</p><small>{item.required ? "Required" : "Optional"} · {item.priority.toLowerCase()} priority{item.dueAt ? ` · due ${new Date(item.dueAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""} · {item.documentCount} linked document{item.documentCount === 1 ? "" : "s"}</small>{item.clientVisible && <small className="admin-evidence-client-label">Visible to client</small>}</div><div className="admin-requirement-list__state"><span>{evidenceRequirementStatusLabels[item.status]}</span>{canReview && <AdminEvidenceRequirementActions claimReference={workspace.claim.claimReference} requirementReference={item.requirementReference} status={item.status} documentCount={item.documentCount} storageAvailable={workspace.documentReviewAvailable} />}</div></li>)}</ol> : <div className="admin-empty admin-empty--large"><h2>No visible evidence requirements.</h2><p>No client-visible evidence requirements are currently linked to this claim.</p></div>}</div>;
}
