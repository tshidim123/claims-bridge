import type { CSSProperties } from "react";

import { claimStageConfig, claimStatusConfig, isClaimStatus } from "@/config/claim-statuses";

export function ClaimStatus({ status }: { status: string }) {
  const config = isClaimStatus(status) ? claimStatusConfig[status] : undefined;
  const label = config?.label ?? "Status unavailable";

  return (
    <span className="claim-status" data-tone={config?.tone ?? "muted"} aria-label={`Current status: ${label}`}>
      <span className="claim-status__marker" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function ClaimStagePath({ status }: { status: string }) {
  const config = isClaimStatus(status) ? claimStatusConfig[status] : undefined;
  const activeStage = config ? claimStageConfig.find((stage) => stage.id === config.stage) : undefined;
  const activeOrder = activeStage?.order ?? 0;
  const progress = activeOrder > 0 ? `${((activeOrder - 1) / (claimStageConfig.length - 1)) * 100}%` : "0%";

  return (
    <div className="claim-stage-path" aria-label="Claim progress stages">
      {activeStage && <div className="claim-stage-path__current"><span className="eyebrow">Current stage · {String(activeStage.order).padStart(2, "0")} of {claimStageConfig.length}</span><strong>{activeStage.label}</strong><p>{activeStage.description}</p></div>}
      <ol className="claim-stage-path__rail" style={{ "--claim-progress": progress } as CSSProperties}>
        {claimStageConfig.map((stage) => {
          const state = stage.order < activeOrder ? "complete" : stage.order === activeOrder ? "current" : "upcoming";

          return (
            <li key={stage.id} data-state={state} aria-current={state === "current" ? "step" : undefined}>
              <span className="claim-stage-path__marker" aria-hidden="true">{String(stage.order).padStart(2, "0")}</span>
              <span>{stage.label}</span>
              {state === "current" && <span className="sr-only">Current stage</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ClaimReference({ reference }: { reference: string }) {
  return (
    <div className="claim-reference">
      <span className="eyebrow">Claim reference</span>
      <strong>{reference}</strong>
    </div>
  );
}
