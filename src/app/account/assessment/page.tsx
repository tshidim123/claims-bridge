import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimCreationForm } from "@/components/claims/claim-creation-form";
import { ClaimStatus } from "@/components/claims/claim-status";
import { GlassSurface } from "@/components/glass/glass-surface";
import { ButtonLink } from "@/components/ui/button";
import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import { getLatestAssessmentForClient } from "@/lib/eligibility/persistence/repository";
import { assessmentPayloadSchema } from "@/lib/eligibility/persistence/validation";
import { getClaimByAssessmentReferenceForClient } from "@/lib/claims/repository";

export default async function AssessmentPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Fassessment");
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Your assessment" description="Database configuration is required to view a saved assessment." /></div>;

  let row;
  let existingClaim;
  try {
    row = await getLatestAssessmentForClient(userId);
    if (row) existingClaim = await getClaimByAssessmentReferenceForClient(userId, row.assessmentReference);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Your assessment" description="Your saved assessment is temporarily unavailable. Please try again shortly." /></div>;
  }

  if (!row) return <div className="account-page"><AccountPageHeader title="Your assessment" description="No saved eligibility assessment is associated with this account yet." /> </div>;

  const parsed = assessmentPayloadSchema.safeParse({ version: Number(row.assessmentVersion), status: row.status === "COMPLETE" ? "complete" : row.status === "REVIEW" ? "review" : "in-progress", currentStepId: row.currentQuestionId ?? "review", answers: row.answers, startedAt: row.startedAt.toISOString() });
  const outcome = parsed.success ? buildAssessmentOutcome(parsed.data.answers) : null;
  const assessmentComplete = row.status === "COMPLETE" && Boolean(row.completedAt);

  return (
    <div className="account-page">
      <AccountPageHeader title="Your assessment" description="This is a preliminary assessment, not a claim. It remains subject to further review." />
      <GlassSurface strength="medium">
        <div className="assessment-summary">
          <div className="assessment-summary__meta">
            <span>Status</span>
            <strong>{row.status.toLowerCase().replaceAll("_", " ")}</strong>
            {row.completedAt && <span>Completed {row.completedAt.toLocaleDateString("en-GB")}</span>}
          </div>
          {outcome && <div className="assessment-summary__outcome"><h2>{outcome.headline}</h2><p>{outcome.explanation}</p><h3>Evidence that may help</h3><ul>{outcome.evidence.map((item) => <li key={item.id}>{item.label} — {item.description}</li>)}</ul></div>}
          {existingClaim ? <div className="assessment-claim-link"><div><p className="eyebrow">Claim created</p><h2>Your Claims Bridge claim</h2><ClaimStatus status={existingClaim.status} /></div><ButtonLink variant="secondary" href={`/account/claims/${encodeURIComponent(existingClaim.claimReference)}`}>View my claim</ButtonLink></div> : assessmentComplete ? <ClaimCreationForm assessmentReference={row.assessmentReference} /> : <p className="assessment-summary__notice">Complete the assessment before choosing whether to continue to claim review.</p>}
        </div>
      </GlassSurface>
    </div>
  );
}
