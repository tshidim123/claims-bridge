import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GlassSurface } from "@/components/glass/glass-surface";
import { eligibilityQuestions } from "@/content/eligibility/questions";
import { getClientAssessmentForAdmin } from "@/lib/admin/operations/repository";
import { getVisibleQuestions } from "@/lib/eligibility/flow";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import { ASSESSMENT_REFERENCE_PATTERN } from "@/lib/eligibility/persistence/reference";
import { assessmentPayloadSchema } from "@/lib/eligibility/persistence/validation";
import { getCurrentStaffContext } from "@/lib/staff/request";

export const metadata = { title: "Client assessment", robots: { index: false, follow: false } };

function displayAnswer(question: (typeof eligibilityQuestions)[number], value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((item) => {
    if ("options" in question) return question.options?.find((option) => option.value === item)?.label ?? String(item);
    return typeof item === "boolean" ? (item ? "Yes" : "No") : String(item);
  }).join(", ");
}

export default async function AdminClientAssessmentPage({ params }: { params: Promise<{ clientReference: string; assessmentReference: string }> }) {
  const { userId } = await auth();
  const context = userId ? await getCurrentStaffContext() : null;
  if (!userId || !context?.permissions.includes("CLIENTS_VIEW")) return <AdminAccessDenied forbidden />;
  const { clientReference, assessmentReference } = await params;
  if (!ASSESSMENT_REFERENCE_PATTERN.test(assessmentReference)) notFound();
  const record = await getClientAssessmentForAdmin(userId, clientReference, assessmentReference).catch(() => undefined);
  if (!record) notFound();

  const { assessment } = record;
  const parsed = assessmentPayloadSchema.safeParse({ version: Number(assessment.assessmentVersion), status: assessment.status === "COMPLETE" ? "complete" : assessment.status === "REVIEW" ? "review" : "in-progress", currentStepId: assessment.currentQuestionId ?? "review", answers: assessment.answers, startedAt: assessment.startedAt.toISOString() });
  const outcome = parsed.success ? buildAssessmentOutcome(parsed.data.answers) : null;
  const visible = parsed.success ? getVisibleQuestions(parsed.data.answers).filter((question) => parsed.data.answers[question.id] !== undefined) : [];
  const grouped = new Map<string, typeof visible>();
  for (const question of visible) grouped.set(question.section, [...(grouped.get(question.section) ?? []), question]);

  return <div className="admin-page assessment-detail-page">
    <AdminPageHeader eyebrow="Operations / client / assessment" title={assessment.assessmentReference} description="A read-only historical eligibility record. Assessment answers are not editable and do not guarantee a claim outcome." />
    <GlassSurface strength="medium"><div className="assessment-summary"><div className="assessment-summary__meta"><span>{assessment.status.replaceAll("_", " ")}</span><span>{assessment.completedAt ? `Completed ${assessment.completedAt.toLocaleDateString("en-GB")}` : `Updated ${assessment.updatedAt.toLocaleDateString("en-GB")}`}</span></div>{outcome && <div className="assessment-summary__outcome"><h2>{outcome.headline}</h2><p>{outcome.explanation}</p><h3>Evidence recommendations</h3><ul>{outcome.evidence.map((item) => <li key={item.id}>{item.label} — {item.description}</li>)}</ul></div>}{record.claimReference && <p className="assessment-summary__notice"><Link className="text-link" href={`/admin/claims/${encodeURIComponent(record.claimReference)}`}>Open linked claim</Link></p>}</div></GlassSurface>
    {grouped.size > 0 && <section className="assessment-answers" aria-labelledby="assessment-answers-title"><div className="claim-section-heading"><div><p className="eyebrow">Historical answers</p><h2 id="assessment-answers-title">Assessment responses</h2></div></div>{[...grouped].map(([section, questions]) => <section key={section}><h3>{section[0].toUpperCase() + section.slice(1)}</h3><dl>{questions.map((question) => <div key={question.id}><dt>{question.reviewLabel ?? question.title}</dt><dd>{displayAnswer(question, parsed.success ? parsed.data.answers[question.id] : undefined)}</dd></div>)}</dl></section>)}</section>}
  </div>;
}
