import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GlassSurface } from "@/components/glass/glass-surface";
import { eligibilityQuestions } from "@/content/eligibility/questions";
import { getAssessmentForAdmin, getPreAccountAssessmentForAdmin } from "@/lib/admin/operations/repository";
import { getVisibleQuestions } from "@/lib/eligibility/flow";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import { ASSESSMENT_REFERENCE_PATTERN } from "@/lib/eligibility/persistence/reference";
import { assessmentPayloadSchema } from "@/lib/eligibility/persistence/validation";
import { getCurrentStaffContext } from "@/lib/staff/request";

export const metadata = { title: "Assessment detail", robots: { index: false, follow: false } };

function displayAnswer(question: (typeof eligibilityQuestions)[number], value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    if ("options" in question) return question.options?.find((option) => option.value === item)?.label ?? String(item);
    return typeof item === "boolean" ? (item ? "Yes" : "No") : String(item);
  }).join(", ");
}

export default async function AdminAssessmentDetailPage({ params }: { params: Promise<{ assessmentReference: string }> }) {
  const { userId } = await auth();
  const context = userId ? await getCurrentStaffContext() : null;
  if (!userId || !context?.permissions.includes("CLIENTS_VIEW")) return <AdminAccessDenied forbidden />;
  const { assessmentReference } = await params;
  if (!ASSESSMENT_REFERENCE_PATTERN.test(assessmentReference)) notFound();
  const record = await getAssessmentForAdmin(userId, assessmentReference).catch(() => undefined);
  if (!record) { const preAccount = await getPreAccountAssessmentForAdmin(userId, assessmentReference).catch(() => undefined); if (!preAccount) notFound(); const parsedPre = assessmentPayloadSchema.safeParse({ version: Number(preAccount.assessment.assessmentVersion), status: "complete", currentStepId: "review", answers: preAccount.assessment.answers, outcomeId: preAccount.assessment.preliminaryOutcome, startedAt: preAccount.assessment.startedAt.toISOString() }); return <div className="admin-page assessment-detail-page"><AdminPageHeader eyebrow="Operations / pre-account assessment" title={preAccount.assessment.assessmentReference} description="A durable signed-out eligibility assessment. It is not an authenticated client assessment until secure conversion completes." /><section className="admin-case-context"><span><small>Submission state</small><strong>Pre-account</strong></span><span><small>Lead reference</small><strong>{preAccount.leadReference}</strong></span><span><small>Contact</small><strong>{preAccount.email} · {preAccount.phone}</strong></span><span><small>Consent</small><strong>{preAccount.serviceConsentAt.toLocaleDateString("en-GB")}</strong></span><span><small>Conversion</small><strong>{preAccount.assessment.convertedAt ? "Converted" : "Awaiting account"}</strong></span></section>{parsedPre.success && <GlassSurface strength="medium"><div className="assessment-summary"><h2>{buildAssessmentOutcome(parsedPre.data.answers).headline}</h2><p>{buildAssessmentOutcome(parsedPre.data.answers).explanation}</p></div></GlassSurface>}</div>; }

  const { assessment } = record;
  const parsed = assessmentPayloadSchema.safeParse({ version: Number(assessment.assessmentVersion), status: assessment.status === "COMPLETE" ? "complete" : assessment.status === "REVIEW" ? "review" : "in-progress", currentStepId: assessment.currentQuestionId ?? "review", answers: assessment.answers, startedAt: assessment.startedAt.toISOString() });
  const outcome = parsed.success ? buildAssessmentOutcome(parsed.data.answers) : null;
  const visible = parsed.success ? getVisibleQuestions(parsed.data.answers).filter((question) => parsed.data.answers[question.id] !== undefined) : [];
  const grouped = new Map<string, typeof visible>();
  for (const question of visible) grouped.set(question.section, [...(grouped.get(question.section) ?? []), question]);
  return <div className="admin-page assessment-detail-page"><AdminPageHeader eyebrow="Operations / assessment" title={assessment.assessmentReference} description="A read-only historical eligibility record. Answers are grouped using the current assessment definitions and do not guarantee a claim outcome." /><section className="admin-case-context"><span><small>Client</small><strong>{record.clientName.trim()}</strong></span><span><small>Client reference</small><strong>{record.clientReference}</strong></span><span><small>Assessment state</small><strong>{assessment.status.replaceAll("_", " ")}</strong></span><span><small>Outcome</small><strong>{assessment.preliminaryOutcome?.replaceAll("_", " ") ?? "Not recorded"}</strong></span><span><small>Date</small><strong>{(assessment.completedAt ?? assessment.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</strong></span><span><small>Claim</small><strong>{record.claimReference ? <Link href={`/admin/claims/${encodeURIComponent(record.claimReference)}`}>{record.claimReference}</Link> : "No linked claim"}</strong></span></section><GlassSurface strength="medium"><div className="assessment-summary">{outcome && <div className="assessment-summary__outcome"><h2>{outcome.headline}</h2><p>{outcome.explanation}</p><h3>Why this result appeared</h3><ul>{outcome.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><h3>Evidence recommendations</h3><ul>{outcome.evidence.map((item) => <li key={item.id}>{item.label} — {item.description}</li>)}</ul></div>}</div></GlassSurface>{grouped.size > 0 ? <section className="assessment-answers" aria-labelledby="assessment-answers-title"><div className="claim-section-heading"><div><p className="eyebrow">Historical answers</p><h2 id="assessment-answers-title">Assessment responses</h2></div></div>{[...grouped].map(([section, questions]) => <section key={section}><h3>{section[0].toUpperCase() + section.slice(1)}</h3><dl>{questions.map((question) => <div key={question.id}><dt>{question.reviewLabel ?? question.title}</dt><dd>{displayAnswer(question, parsed.success ? parsed.data.answers[question.id] : undefined)}</dd></div>)}</dl></section>)}</section> : <div className="admin-empty admin-empty--large"><h2>No canonical answers available.</h2><p>The assessment record is retained, but its saved answer payload does not match the current assessment definition.</p></div>}</div>;
}
