export const claimStatuses = [
  "eligibility-started",
  "eligibility-submitted",
  "initial-review",
  "further-information-required",
  "evidence-collection",
  "evidence-review",
  "claim-assessment",
  "claim-preparation",
  "awaiting-client-action",
  "awaiting-third-party",
  "in-progress",
  "negotiation-resolution",
  "completed",
  "closed",
  "not-eligible",
] as const;

export type ClaimStatus = (typeof claimStatuses)[number];

export const claimStatusLabels: Record<ClaimStatus, string> = {
  "eligibility-started": "Eligibility started",
  "eligibility-submitted": "Eligibility submitted",
  "initial-review": "Initial review",
  "further-information-required": "Further information required",
  "evidence-collection": "Evidence collection",
  "evidence-review": "Evidence review",
  "claim-assessment": "Claim assessment",
  "claim-preparation": "Claim preparation",
  "awaiting-client-action": "Awaiting client action",
  "awaiting-third-party": "Awaiting third party",
  "in-progress": "In progress",
  "negotiation-resolution": "Negotiation / resolution stage",
  completed: "Completed",
  closed: "Closed",
  "not-eligible": "Not eligible",
};
