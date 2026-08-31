import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimCreationForm } from "@/components/claims/claim-creation-form";
import { ClaimStatus } from "@/components/claims/claim-status";
import { GlassSurface } from "@/components/glass/glass-surface";
import { eligibilityQuestions } from "@/content/eligibility/questions";
import { getClaimByAssessmentReferenceForClient } from "@/lib/claims/repository";
import { getVisibleQuestions } from "@/lib/eligibility/flow";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import { getAssessmentForClient } from "@/lib/eligibility/persistence/repository";
import { ASSESSMENT_REFERENCE_PATTERN } from "@/lib/eligibility/persistence/reference";
import { assessmentPayloadSchema } from "@/lib/eligibility/persistence/validation";

export const metadata = { title: "Assessment" };

function displayAnswer(question: (typeof eligibilityQuestions)[number], value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    if ("options" in question) return question.options?.find((option) => option.value === item)?.label ?? String(item);
    return typeof item === "boolean" ? (item ? "Yes" : "No") : String(item);
  }).join(", ");
}

export default async function AssessmentDetailPage({ params }: { params: Promise<{ assessmentReference: string }> }) {
  const { assessmentReference } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/account/assessments/${assessmentReference}`)}`);
  if (!ASSESSMENT_REFERENCE_PATTERN.test(assessmentReference) || !process.env.DATABASE_URL) notFound();

  const assessment = await getAssessmentForClient(userId, assessmentReference).catch(() => undefined);
  if (!assessment) notFound();
  const parsed = assessmentPayloadSchema.safeParse({ version: Number(assessment.assessmentVersion), status: assessment.status === "COMPLETE" ? "complete" : assessment.status === "REVIEW" ? "review" : "in-progress", currentStepId: assessment.currentQuestionId ?? "review", answers: assessment.answers, startedAt: assessment.startedAt.toISOString() });
  const outcome = parsed.success ? buildAssessmentOutcome(parsed.data.answers) : null;
  const visibleQuestions = parsed.success ? getVisibleQuestions(parsed.data.answers).filter((question) => parsed.data.answers[question.id] !== undefined) : [];
  const grouped = new Map<string, typeof visibleQuestions>();
  for (const question of visibleQuestions) grouped.set(question.section, [...(grouped.get(question.section) ?? []), question]);
  const claim = await getClaimByAssessmentReferenceForClient(userId, assessmentReference).catch(() => undefined);
  const complete = assessment.status === "COMPLETE" && Boolean(assessment.completedAt);

  return <div className="account-page assessment-detail-page">
    <AccountPageHeader eyebrow="Preliminary assessment" title="Assessment detail" description="This saved assessment records the answers you provided. It is not a legal conclusion or a guarantee that a claim will succeed." />
    <GlassSurface strength="medium"><div className="assessment-summary"><div className="assessment-summary__meta"><span>{assessment.assessmentReference}</span><strong>{assessment.status.replaceAll("_", " ").toLowerCase()}</strong><span>{assessment.completedAt ? `Completed ${assessment.completedAt.toLocaleDateString("en-GB")}` : `Updated ${assessment.updatedAt.toLocaleDateString("en-GB")}`}</span></div>{outcome && <div className="assessment-summary__outcome"><h2>{outcome.headline}</h2><p>{outcome.explanation}</p><h3>Evidence that may help</h3><ul>{outcome.evidence.map((item) => <li key={item.id}>{item.label} — {item.description}</li>)}</ul></div>}{claim ? <div className="assessment-claim-link"><div><p className="eyebrow">Claim created</p><h2>Your Claims Bridge claim</h2><ClaimStatus status={claim.status} /></div><Link className="button button--secondary button--medium" href={`/account/claims/${encodeURIComponent(claim.claimReference)}`}><span className="button__label">View my claim</span></Link></div> : complete ? <ClaimCreationForm assessmentReference={assessment.assessmentReference} /> : <p className="assessment-summary__notice">This assessment is not complete yet. Continue the eligibility check when you are ready.</p>}</div></GlassSurface>
    {grouped.size > 0 && <section className="assessment-answers" aria-labelledby="assessment-answers-title"><div className="claim-section-heading"><div><p className="eyebrow">Your recorded answers</p><h2 id="assessment-answers-title">Assessment responses</h2></div></div>{[...grouped].map(([section, questions]) => <section key={section}><h3>{section}</h3><dl>{questions.map((question) => <div key={question.id}><dt>{question.reviewLabel ?? question.title}</dt><dd>{displayAnswer(question, parsed.success ? parsed.data.answers[question.id] : undefined)}</dd></div>)}</dl></section>)}</section>}
  </div>;
}
