import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminClaimWorkspace } from "@/lib/admin/claims/repository";

export default async function AdminClaimAssessmentPage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let workspace;
  try { workspace = await getAdminClaimWorkspace(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  if (!workspace) notFound();
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / assessment" title="Preliminary eligibility context" description="The originating assessment is presented as preliminary context, not as a legal determination or final claim outcome." />{workspace.assessment ? <><dl className="admin-info-grid"><div><dt>Assessment status</dt><dd>{workspace.assessment.status}</dd></div><div><dt>Preliminary outcome</dt><dd>{workspace.assessment.preliminaryOutcome ?? "Not recorded"}</dd></div><div><dt>Assessed</dt><dd>{workspace.assessment.assessedAt ? new Date(workspace.assessment.assessedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "Not completed"}</dd></div></dl><section className="admin-answer-list" aria-labelledby="assessment-answers-title"><h2 id="assessment-answers-title">Recorded answers</h2><dl>{workspace.assessment.answers.map((answer) => <div key={answer.key}><dt>{answer.key}</dt><dd>{answer.value}</dd></div>)}</dl></section></> : <div className="admin-empty admin-empty--large"><h2>No assessment is linked.</h2><p>This claim does not currently expose an assessment record.</p></div>}</div>;
}
