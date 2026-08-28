import Link from "next/link";

import { claimWaitingOnLabels, getClaimNextStep, getClaimNextStepForClient, type ClaimWaitingOn } from "@/config/claim-tracking";
import { claimStatusConfig, isClaimStatus } from "@/config/claim-statuses";

const waitingOnShortLabels: Record<ClaimWaitingOn, string> = {
  CLAIMS_BRIDGE: "Claims Bridge",
  CLIENT: "You",
  THIRD_PARTY: "Another party",
  NONE: "No one",
};

export function ClaimNextStep({ status, claimReference, evidenceActionRequired = false }: { status: string; claimReference?: string; evidenceActionRequired?: boolean }) {
  const knownStatus = isClaimStatus(status) ? status : "SUBMITTED";
  const config = getClaimNextStepForClient(knownStatus, evidenceActionRequired);

  return (
    <section className="claim-next-step" aria-labelledby="claim-next-step-title">
      <div className="claim-next-step__copy"><p className="eyebrow">What happens next</p><h2 id="claim-next-step-title">{config.title}</h2><p>{config.explanation}</p>{config.guidance && <p className="claim-next-step__guidance">{config.guidance}</p>}{config.relatedDestination === "evidence" && claimReference && <Link className="text-link" href={`/account/claims/${encodeURIComponent(claimReference)}/evidence`}>Review evidence requirements <span aria-hidden="true">→</span></Link>}</div>
      <div className="claim-next-step__waiting"><span className="eyebrow">Waiting on</span><strong>{claimWaitingOnLabels[config.waitingOn]}</strong><span className="claim-next-step__waiting-detail">{waitingOnShortLabels[config.waitingOn]}</span>{config.actionMayBeRequired && <span className="claim-next-step__action-note">Client action may be required</span>}</div>
      <span className="sr-only">Current status: {claimStatusConfig[knownStatus].label}</span>
    </section>
  );
}

export function ClaimWaitingState({ status }: { status: string }) {
  const knownStatus = isClaimStatus(status) ? status : "SUBMITTED";
  const waitingOn = getClaimNextStep(knownStatus).waitingOn;

  return <span className="claim-waiting-state"><span className="claim-waiting-state__marker" aria-hidden="true" />{claimWaitingOnLabels[waitingOn]}</span>;
}
