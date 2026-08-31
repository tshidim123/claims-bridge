import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimStatus } from "@/components/claims/claim-status";
import { getAssessmentsForClient } from "@/lib/eligibility/persistence/repository";

export const metadata = { title: "Assessments" };

export default async function AccountAssessmentsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Fassessments");
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Assessments unavailable" description="Your saved assessments are temporarily unavailable while database configuration is completed." /></div>;

  let assessments: Awaited<ReturnType<typeof getAssessmentsForClient>>;
  try {
    assessments = await getAssessmentsForClient(userId);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Assessments unavailable" description="We couldn't load your saved assessments just now. Please try again shortly." /></div>;
  }

  return <div className="account-page">
    <AccountPageHeader title="Your assessments" description="Saved preliminary eligibility assessments. An assessment is not a claim and does not guarantee an outcome." />
    {assessments.length === 0 ? <section className="account-empty glass-surface glass-surface--medium"><div className="glass-surface__content account-empty__content"><div><p className="eyebrow">No saved assessments</p><h2>Start with an eligibility check.</h2><p>When you finish a check while signed in, it will appear here for you to review.</p></div><Link className="button button--primary button--medium" href="/check-eligibility"><span className="button__label">Check eligibility</span></Link></div></section> : <ol className="assessment-record-list" aria-label="Saved eligibility assessments">{assessments.map(({ assessment, claimReference, claimStatus }) => <li key={assessment.assessmentReference}><Link className="assessment-record" href={`/account/assessments/${encodeURIComponent(assessment.assessmentReference)}`}><div><p className="eyebrow">{assessment.assessmentReference}</p><h2>{assessment.status === "COMPLETE" ? "Completed preliminary assessment" : "Saved assessment"}</h2><p>{assessment.preliminaryOutcome ? assessment.preliminaryOutcome.replaceAll("_", " ") : "Assessment in progress"}</p></div><div className="assessment-record__meta"><time dateTime={(assessment.completedAt ?? assessment.updatedAt).toISOString()}>{assessment.completedAt ? `Completed ${assessment.completedAt.toLocaleDateString("en-GB")}` : `Updated ${assessment.updatedAt.toLocaleDateString("en-GB")}`}</time>{claimReference && claimStatus ? <span><ClaimStatus status={claimStatus} /> Claim created</span> : <span>{assessment.status === "COMPLETE" ? "Review next steps" : "Continue when ready"}</span>}</div></Link></li>)}</ol>}
  </div>;
}
