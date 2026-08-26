export const documentCategories = [
  "tenancy-agreement",
  "deposit-payment-evidence",
  "prescribed-information",
  "deposit-certificate",
  "scheme-correspondence",
  "landlord-correspondence",
  "letting-agent-correspondence",
  "bank-payment-records",
  "identification",
  "supporting-evidence",
  "other",
] as const;

export type DocumentCategory = (typeof documentCategories)[number];

export const documentReviewStates = [
  "requested",
  "uploading",
  "submitted",
  "under-review",
  "accepted",
  "replacement-required",
] as const;

export type DocumentReviewState = (typeof documentReviewStates)[number];
