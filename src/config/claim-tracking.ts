import { claimStatusConfig, type ClaimStatus } from "./claim-statuses";

export type ClaimWaitingOn = "CLAIMS_BRIDGE" | "CLIENT" | "THIRD_PARTY" | "NONE";

export type ClaimNextStepConfig = {
  title: string;
  explanation: string;
  waitingOn: ClaimWaitingOn;
  actionMayBeRequired: boolean;
  guidance?: string;
  relatedDestination?: "evidence";
};

const baseNextStep: ClaimNextStepConfig = {
  title: "Claims Bridge will review the information currently available.",
  explanation: "Your claim is in the workflow and further assessment may be required.",
  waitingOn: "CLAIMS_BRIDGE",
  actionMayBeRequired: false,
};

export const claimNextStepConfig: Readonly<Record<ClaimStatus, ClaimNextStepConfig>> = {
  SUBMITTED: { ...baseNextStep, title: "Your claim has been received.", explanation: "Claims Bridge will review the information currently available.", guidance: "There is no response time promise at this stage." },
  INITIAL_REVIEW: { ...baseNextStep, title: "We’re reviewing your claim information.", explanation: "The information currently available is being checked to understand the next stage.", guidance: "Please keep any relevant records available in case more information is needed." },
  INFORMATION_REQUIRED: { title: "More information may be required.", explanation: "Further information may be needed before assessment can continue.", waitingOn: "CLIENT", actionMayBeRequired: true, guidance: "A specific request will be shown here when the relevant client action is activated." },
  EVIDENCE_COLLECTION: { ...baseNextStep, title: "Supporting information is being collected.", explanation: "The claim is in the evidence stage. Further assessment may be required.", waitingOn: "CLAIMS_BRIDGE" },
  EVIDENCE_REVIEW: { ...baseNextStep, title: "The available evidence is being reviewed.", explanation: "Claims Bridge is considering the supporting information currently available.", waitingOn: "CLAIMS_BRIDGE" },
  CLAIM_ASSESSMENT: { ...baseNextStep, title: "Your claim is under further assessment.", explanation: "The claim is being assessed using the information currently available.", waitingOn: "CLAIMS_BRIDGE" },
  CLAIM_PREPARATION: { ...baseNextStep, title: "The next workflow stage is being prepared.", explanation: "Claims Bridge is preparing the next step for this claim.", waitingOn: "CLAIMS_BRIDGE" },
  AWAITING_CLIENT: { title: "Your claim is waiting for information or action from you.", explanation: "A response or information may be required before the workflow can continue.", waitingOn: "CLIENT", actionMayBeRequired: true, guidance: "The specific request will be shown when the relevant client action is activated." },
  AWAITING_THIRD_PARTY: { title: "Your claim is waiting on another party.", explanation: "Progress is currently waiting for information or action outside Claims Bridge.", waitingOn: "THIRD_PARTY", actionMayBeRequired: false },
  IN_PROGRESS: { ...baseNextStep, title: "Your claim is progressing through the workflow.", explanation: "Claims Bridge is continuing work on the current stage.", waitingOn: "CLAIMS_BRIDGE" },
  NEGOTIATION_OR_RESOLUTION: { ...baseNextStep, title: "Your claim is in a progress or resolution stage.", explanation: "The workflow is moving through a resolution stage. This does not imply a legal outcome.", waitingOn: "CLAIMS_BRIDGE" },
  COMPLETED: { title: "The Claims Bridge workflow is complete.", explanation: "This claim record has reached a completed workflow state.", waitingOn: "NONE", actionMayBeRequired: false },
  CLOSED: { title: "This claim record is closed.", explanation: "No further workflow action is currently shown for this claim record.", waitingOn: "NONE", actionMayBeRequired: false },
  NOT_ELIGIBLE: { title: "No eligible route was identified in the current assessment.", explanation: "This is a workflow outcome and not a determination of legal merit.", waitingOn: "NONE", actionMayBeRequired: false },
};

export const claimWaitingOnLabels: Readonly<Record<ClaimWaitingOn, string>> = {
  CLAIMS_BRIDGE: "Waiting on Claims Bridge",
  CLIENT: "Your action may be required",
  THIRD_PARTY: "Waiting on another party",
  NONE: "No immediate action required",
};

export function getClaimNextStep(status: ClaimStatus) {
  return claimNextStepConfig[status];
}

export function getClaimNextStepForClient(status: ClaimStatus, evidenceActionRequired = false): ClaimNextStepConfig {
  if (evidenceActionRequired) {
    return {
      title: "Your evidence may need attention.",
      explanation: "Review the current evidence requests to see whether information or action is needed from you.",
      waitingOn: "CLIENT",
      actionMayBeRequired: true,
      guidance: "Missing a document does not by itself determine the outcome of your claim.",
      relatedDestination: "evidence",
    };
  }
  return claimNextStepConfig[status];
}

export function getClaimWaitingOn(status: ClaimStatus) {
  return claimNextStepConfig[status].waitingOn;
}

export type TransitionTimelineConfig = {
  eventType: "REVIEW_STARTED" | "EVIDENCE_REQUESTED" | "EVIDENCE_RECEIVED" | "STATUS_UPDATED" | "CLIENT_ACTION_REQUIRED" | "RESOLUTION_UPDATE";
  title: string;
  description: string;
} | null;

export const transitionTimelineConfig: Readonly<Record<ClaimStatus, TransitionTimelineConfig>> = {
  SUBMITTED: null,
  INITIAL_REVIEW: { eventType: "REVIEW_STARTED", title: "Review started", description: "Claims Bridge has started reviewing the information currently available." },
  INFORMATION_REQUIRED: { eventType: "CLIENT_ACTION_REQUIRED", title: "Further information may be required", description: "The claim may need further information before assessment can continue." },
  EVIDENCE_COLLECTION: { eventType: "EVIDENCE_REQUESTED", title: "Evidence stage started", description: "The claim has moved into the evidence stage." },
  EVIDENCE_REVIEW: { eventType: "EVIDENCE_RECEIVED", title: "Evidence review started", description: "The available supporting information is now being reviewed." },
  CLAIM_ASSESSMENT: { eventType: "STATUS_UPDATED", title: "Assessment started", description: "The claim has moved into further assessment." },
  CLAIM_PREPARATION: { eventType: "STATUS_UPDATED", title: "Claim preparation started", description: "The next workflow stage is being prepared." },
  AWAITING_CLIENT: { eventType: "CLIENT_ACTION_REQUIRED", title: "Client action may be required", description: "The claim is waiting for information or action from the client." },
  AWAITING_THIRD_PARTY: null,
  IN_PROGRESS: { eventType: "STATUS_UPDATED", title: "Claim in progress", description: "The claim is progressing through the Claims Bridge workflow." },
  NEGOTIATION_OR_RESOLUTION: { eventType: "RESOLUTION_UPDATE", title: "Resolution stage started", description: "The claim has moved into a progress or resolution stage." },
  COMPLETED: { eventType: "RESOLUTION_UPDATE", title: "Workflow completed", description: "The Claims Bridge workflow for this claim has completed." },
  CLOSED: { eventType: "STATUS_UPDATED", title: "Claim closed", description: "This claim record has been closed." },
  NOT_ELIGIBLE: { eventType: "STATUS_UPDATED", title: "Eligibility outcome updated", description: "The current assessment did not identify an eligible route." },
};

export function getTransitionTimeline(status: ClaimStatus) {
  return transitionTimelineConfig[status];
}

export const claimTimelineEventLabels: Readonly<Record<string, string>> = {
  CLAIM_SUBMITTED: "Claim submitted",
  REVIEW_STARTED: "Review started",
  EVIDENCE_REQUESTED: "Evidence stage",
  EVIDENCE_RECEIVED: "Evidence review",
  STATUS_UPDATED: "Status update",
  CLIENT_ACTION_REQUIRED: "Client action",
  CORRESPONDENCE_SENT: "Correspondence",
  RESOLUTION_UPDATE: "Resolution update",
  DOCUMENT_RECEIVED: "Evidence received",
  DOCUMENT_REVIEW_STARTED: "Evidence review",
  DOCUMENT_ACCEPTED: "Evidence recorded",
  MORE_EVIDENCE_REQUIRED: "More evidence required",
};

export function getPreliminaryOutcomeLabel(value: string | null | undefined) {
  const labels: Record<string, string> = {
    REVIEW_RECOMMENDED: "Review recommended",
    MORE_INFORMATION_NEEDED: "More information needed",
    OUTSIDE_CURRENT_SCOPE: "Outside current scope",
    NO_DEPOSIT_PATH: "No deposit path identified",
    INDIVIDUAL_REVIEW: "Individual review",
  };
  return value ? labels[value] ?? "Preliminary outcome recorded" : "Not recorded";
}

export function getStageForStatus(status: ClaimStatus) {
  return claimStatusConfig[status].stage;
}
