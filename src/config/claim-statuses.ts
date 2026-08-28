export const claimStatuses = [
  "SUBMITTED",
  "INITIAL_REVIEW",
  "INFORMATION_REQUIRED",
  "EVIDENCE_COLLECTION",
  "EVIDENCE_REVIEW",
  "CLAIM_ASSESSMENT",
  "CLAIM_PREPARATION",
  "AWAITING_CLIENT",
  "AWAITING_THIRD_PARTY",
  "IN_PROGRESS",
  "NEGOTIATION_OR_RESOLUTION",
  "COMPLETED",
  "CLOSED",
  "NOT_ELIGIBLE",
] as const;

export type ClaimStatus = (typeof claimStatuses)[number];
export type ClaimStage =
  | "SUBMITTED"
  | "INITIAL_REVIEW"
  | "EVIDENCE"
  | "ASSESSMENT"
  | "PREPARATION"
  | "PROGRESS_RESOLUTION"
  | "CLOSED";
export type ClaimTone = "accent" | "info" | "warning" | "success" | "muted";

export const claimStageConfig: ReadonlyArray<{ id: ClaimStage; label: string; order: number; description: string }> = [
  { id: "SUBMITTED", label: "Submitted", order: 1, description: "Your claim record is open and ready for the information currently available to be reviewed." },
  { id: "INITIAL_REVIEW", label: "Initial review", order: 2, description: "The information currently available is being reviewed for the next step." },
  { id: "EVIDENCE", label: "Evidence", order: 3, description: "Supporting information is being gathered and considered." },
  { id: "ASSESSMENT", label: "Assessment", order: 4, description: "The claim is undergoing further assessment." },
  { id: "PREPARATION", label: "Preparation", order: 5, description: "The next part of the Claims Bridge workflow is being prepared." },
  { id: "PROGRESS_RESOLUTION", label: "Progress / resolution", order: 6, description: "The claim is moving through its progress or resolution stage." },
  { id: "CLOSED", label: "Closed", order: 7, description: "This claim record has reached a terminal workflow state." },
];

export type ClaimStatusConfig = {
  id: ClaimStatus;
  label: string;
  shortLabel: string;
  description: string;
  stage: ClaimStage;
  clientVisible: boolean;
  terminal: boolean;
  tone: ClaimTone;
  order: number;
};

export const claimStatusConfig: Readonly<Record<ClaimStatus, ClaimStatusConfig>> = {
  SUBMITTED: { id: "SUBMITTED", label: "Submitted", shortLabel: "Submitted", description: "Your claim record has been created and is ready for the initial review process.", stage: "SUBMITTED", clientVisible: true, terminal: false, tone: "accent", order: 1 },
  INITIAL_REVIEW: { id: "INITIAL_REVIEW", label: "Initial review", shortLabel: "Initial review", description: "Claims Bridge is reviewing the information provided so far.", stage: "INITIAL_REVIEW", clientVisible: true, terminal: false, tone: "info", order: 2 },
  INFORMATION_REQUIRED: { id: "INFORMATION_REQUIRED", label: "Information required", shortLabel: "Action needed", description: "Further information may be needed before the review can continue.", stage: "EVIDENCE", clientVisible: true, terminal: false, tone: "warning", order: 3 },
  EVIDENCE_COLLECTION: { id: "EVIDENCE_COLLECTION", label: "Evidence collection", shortLabel: "Evidence", description: "Relevant supporting information is being gathered.", stage: "EVIDENCE", clientVisible: true, terminal: false, tone: "info", order: 4 },
  EVIDENCE_REVIEW: { id: "EVIDENCE_REVIEW", label: "Evidence review", shortLabel: "Evidence review", description: "The available supporting information is being considered.", stage: "EVIDENCE", clientVisible: true, terminal: false, tone: "info", order: 5 },
  CLAIM_ASSESSMENT: { id: "CLAIM_ASSESSMENT", label: "Claim assessment", shortLabel: "Assessment", description: "The claim is undergoing further assessment.", stage: "ASSESSMENT", clientVisible: true, terminal: false, tone: "info", order: 6 },
  CLAIM_PREPARATION: { id: "CLAIM_PREPARATION", label: "Claim preparation", shortLabel: "Preparation", description: "The next stage of the claim workflow is being prepared.", stage: "PREPARATION", clientVisible: true, terminal: false, tone: "info", order: 7 },
  AWAITING_CLIENT: { id: "AWAITING_CLIENT", label: "Awaiting your action", shortLabel: "Your action", description: "The claim is waiting for an action or response from you.", stage: "PROGRESS_RESOLUTION", clientVisible: true, terminal: false, tone: "warning", order: 8 },
  AWAITING_THIRD_PARTY: { id: "AWAITING_THIRD_PARTY", label: "Awaiting third party", shortLabel: "Awaiting third party", description: "Progress is waiting on information or a response from another party.", stage: "PROGRESS_RESOLUTION", clientVisible: true, terminal: false, tone: "warning", order: 9 },
  IN_PROGRESS: { id: "IN_PROGRESS", label: "In progress", shortLabel: "In progress", description: "Your claim is progressing through the Claims Bridge workflow.", stage: "PROGRESS_RESOLUTION", clientVisible: true, terminal: false, tone: "accent", order: 10 },
  NEGOTIATION_OR_RESOLUTION: { id: "NEGOTIATION_OR_RESOLUTION", label: "Negotiation / resolution", shortLabel: "Resolution stage", description: "The claim is in a progress or resolution stage. This does not imply a legal outcome.", stage: "PROGRESS_RESOLUTION", clientVisible: true, terminal: false, tone: "accent", order: 11 },
  COMPLETED: { id: "COMPLETED", label: "Completed", shortLabel: "Completed", description: "The Claims Bridge workflow for this claim has completed.", stage: "CLOSED", clientVisible: true, terminal: true, tone: "success", order: 12 },
  CLOSED: { id: "CLOSED", label: "Closed", shortLabel: "Closed", description: "This claim record is closed.", stage: "CLOSED", clientVisible: true, terminal: true, tone: "muted", order: 13 },
  NOT_ELIGIBLE: { id: "NOT_ELIGIBLE", label: "Not eligible", shortLabel: "Not eligible", description: "The current assessment did not identify an eligible route. This is not a determination of legal merit.", stage: "CLOSED", clientVisible: true, terminal: true, tone: "muted", order: 14 },
};

export const claimStatusLabels = Object.fromEntries(
  claimStatuses.map((status) => [status, claimStatusConfig[status].label]),
) as Record<ClaimStatus, string>;

const legalTransitions: Readonly<Record<ClaimStatus, readonly ClaimStatus[]>> = {
  SUBMITTED: ["INITIAL_REVIEW", "INFORMATION_REQUIRED", "NOT_ELIGIBLE"],
  INITIAL_REVIEW: ["INFORMATION_REQUIRED", "EVIDENCE_COLLECTION", "CLAIM_ASSESSMENT", "NOT_ELIGIBLE"],
  INFORMATION_REQUIRED: ["INITIAL_REVIEW", "EVIDENCE_COLLECTION", "AWAITING_CLIENT", "NOT_ELIGIBLE"],
  EVIDENCE_COLLECTION: ["EVIDENCE_REVIEW", "INFORMATION_REQUIRED", "AWAITING_CLIENT"],
  EVIDENCE_REVIEW: ["CLAIM_ASSESSMENT", "INFORMATION_REQUIRED", "NOT_ELIGIBLE"],
  CLAIM_ASSESSMENT: ["CLAIM_PREPARATION", "INFORMATION_REQUIRED", "NOT_ELIGIBLE"],
  CLAIM_PREPARATION: ["AWAITING_CLIENT", "AWAITING_THIRD_PARTY", "IN_PROGRESS"],
  AWAITING_CLIENT: ["CLAIM_PREPARATION", "IN_PROGRESS", "CLOSED"],
  AWAITING_THIRD_PARTY: ["CLAIM_PREPARATION", "IN_PROGRESS"],
  IN_PROGRESS: ["NEGOTIATION_OR_RESOLUTION", "AWAITING_CLIENT", "AWAITING_THIRD_PARTY", "COMPLETED"],
  NEGOTIATION_OR_RESOLUTION: ["IN_PROGRESS", "AWAITING_CLIENT", "COMPLETED", "CLOSED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
  NOT_ELIGIBLE: [],
};

export function isClaimStatus(value: string): value is ClaimStatus {
  return value in claimStatusConfig;
}

export function isTerminalClaimStatus(status: ClaimStatus) {
  return claimStatusConfig[status].terminal;
}

export function canTransitionClaimStatus(from: ClaimStatus, to: ClaimStatus) {
  return legalTransitions[from].includes(to);
}
