import { claimNextStepConfig } from "@/config/claim-tracking";
import type { ClaimStatus } from "@/config/claim-statuses";

export type ClaimStatusCommunication = { event: "CLAIM_STATUS_UPDATED" | "CLAIM_COMPLETED"; notification: "CLAIM_STATUS_UPDATED" | "CLAIM_PROGRESS_UPDATE" | "CLIENT_ACTION_REQUIRED" | "CLAIM_COMPLETED"; heading: string; summary: string; nextStep: string; actionRequired: boolean } | null;

export const claimStatusCommunicationPolicy: Readonly<Record<ClaimStatus, ClaimStatusCommunication>> = {
  SUBMITTED: null,
  INITIAL_REVIEW: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_PROGRESS_UPDATE", heading: "Your claim is being reviewed", summary: claimNextStepConfig.INITIAL_REVIEW.explanation, nextStep: "Keep relevant records available while we review the information currently provided.", actionRequired: false },
  INFORMATION_REQUIRED: { event: "CLAIM_STATUS_UPDATED", notification: "CLIENT_ACTION_REQUIRED", heading: "More information may be needed", summary: claimNextStepConfig.INFORMATION_REQUIRED.explanation, nextStep: "Review your secure claim area for any specific request.", actionRequired: true },
  EVIDENCE_COLLECTION: null,
  EVIDENCE_REVIEW: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_PROGRESS_UPDATE", heading: "Your evidence is being reviewed", summary: claimNextStepConfig.EVIDENCE_REVIEW.explanation, nextStep: "We will update your secure account if anything else is needed.", actionRequired: false },
  CLAIM_ASSESSMENT: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_STATUS_UPDATED", heading: "Your claim is under further assessment", summary: claimNextStepConfig.CLAIM_ASSESSMENT.explanation, nextStep: "You can review the latest information in your secure claim area.", actionRequired: false },
  CLAIM_PREPARATION: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_PROGRESS_UPDATE", heading: "The next claim stage is being prepared", summary: claimNextStepConfig.CLAIM_PREPARATION.explanation, nextStep: "We will notify you if information or action is needed.", actionRequired: false },
  AWAITING_CLIENT: { event: "CLAIM_STATUS_UPDATED", notification: "CLIENT_ACTION_REQUIRED", heading: "Your claim may need your attention", summary: claimNextStepConfig.AWAITING_CLIENT.explanation, nextStep: "Review your secure claim area for the specific action or response needed.", actionRequired: true },
  AWAITING_THIRD_PARTY: null,
  IN_PROGRESS: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_PROGRESS_UPDATE", heading: "Your claim is progressing", summary: claimNextStepConfig.IN_PROGRESS.explanation, nextStep: "No action is currently shown for you.", actionRequired: false },
  NEGOTIATION_OR_RESOLUTION: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_STATUS_UPDATED", heading: "There is an update on your claim", summary: claimNextStepConfig.NEGOTIATION_OR_RESOLUTION.explanation, nextStep: "Review the latest update in your secure claim area.", actionRequired: false },
  COMPLETED: { event: "CLAIM_COMPLETED", notification: "CLAIM_COMPLETED", heading: "The Claims Bridge workflow is complete", summary: "The Claims Bridge workflow for this claim has reached a completed state. This does not by itself confirm a legal or compensation outcome.", nextStep: "Review your claim summary and contact support if you need help understanding the information shown.", actionRequired: false },
  CLOSED: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_STATUS_UPDATED", heading: "Your claim record is closed", summary: claimNextStepConfig.CLOSED.explanation, nextStep: "Review your claim summary for the current record information.", actionRequired: false },
  NOT_ELIGIBLE: { event: "CLAIM_STATUS_UPDATED", notification: "CLAIM_STATUS_UPDATED", heading: "There is an update on your claim", summary: claimNextStepConfig.NOT_ELIGIBLE.explanation, nextStep: "Review your claim summary for the current assessment information.", actionRequired: false },
};
