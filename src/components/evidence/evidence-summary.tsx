import { evidenceCompletenessStateConfig } from "@/config/evidence";
import type { EvidenceSummary as EvidenceSummaryData } from "@/lib/evidence/summary";

export function EvidenceSummary({ summary, compact = false }: { summary: EvidenceSummaryData; compact?: boolean }) {
  const state = evidenceCompletenessStateConfig[summary.completenessState];
  const stats = [
    ["Requested", summary.requestedCount],
    ["Provided", summary.providedCount],
    ["Under review", summary.underReviewCount],
    ["Needs attention", summary.actionRequiredCount],
  ] as const;

  return (
    <section className={`evidence-summary${compact ? " evidence-summary--compact" : ""}`} aria-labelledby="evidence-summary-title">
      <div className="evidence-summary__heading">
        <div><p className="eyebrow">Evidence completeness</p><h2 id="evidence-summary-title">{state.label}</h2><p>{state.description}</p></div>
        <span className="evidence-summary__state" data-state={summary.completenessState}>{state.label}</span>
      </div>
      <dl className="evidence-summary__stats">
        {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {!compact && <p className="evidence-summary__note">This summary reflects the evidence currently requested for this claim. It is not a prediction of the claim outcome.</p>}
    </section>
  );
}
