import type { EvidenceRequirementStatus } from "@/config/evidence";

export type EvidenceSummaryState = "NOT_STARTED" | "IN_PROGRESS" | "READY_FOR_REVIEW" | "REVIEWING" | "ACTION_REQUIRED" | "COMPLETE";

export type EvidenceSummaryInput = {
  status: EvidenceRequirementStatus;
  required: boolean;
  documentCount: number;
};

export type EvidenceSummary = {
  requestedCount: number;
  providedCount: number;
  acceptedCount: number;
  underReviewCount: number;
  actionRequiredCount: number;
  completenessState: EvidenceSummaryState;
  outstandingRequirements: EvidenceSummaryInput[];
};

const providedStatuses: EvidenceRequirementStatus[] = ["UPLOADED", "UNDER_REVIEW", "ACCEPTED"];

export function deriveEvidenceSummary(requirements: EvidenceSummaryInput[]): EvidenceSummary {
  const active = requirements.filter((item) => item.status !== "WAIVED");
  const required = active.filter((item) => item.required);
  const provided = active.filter((item) => item.documentCount > 0 || providedStatuses.includes(item.status));
  const accepted = active.filter((item) => item.status === "ACCEPTED");
  const underReview = active.filter((item) => item.status === "UNDER_REVIEW");
  const actionRequired = active.filter((item) => item.required && (item.status === "REQUESTED" || item.status === "MORE_INFORMATION_REQUIRED"));
  const outstanding = active.filter((item) => item.required && item.status !== "ACCEPTED");

  let completenessState: EvidenceSummaryState = "NOT_STARTED";
  if (required.length === 0) completenessState = "NOT_STARTED";
  else if (actionRequired.length > 0) completenessState = "ACTION_REQUIRED";
  else if (accepted.length === required.length) completenessState = "COMPLETE";
  else if (underReview.length > 0) completenessState = "REVIEWING";
  else if (provided.length >= required.length) completenessState = "READY_FOR_REVIEW";
  else if (provided.length > 0) completenessState = "IN_PROGRESS";

  return {
    requestedCount: active.length,
    providedCount: provided.length,
    acceptedCount: accepted.length,
    underReviewCount: underReview.length,
    actionRequiredCount: actionRequired.length,
    completenessState,
    outstandingRequirements: outstanding,
  };
}
