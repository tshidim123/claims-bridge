export const evidenceRequirementTypes = [
  "TENANCY_AGREEMENT",
  "DEPOSIT_PAYMENT_EVIDENCE",
  "DEPOSIT_PROTECTION_CERTIFICATE",
  "PRESCRIBED_INFORMATION",
  "SCHEME_CORRESPONDENCE",
  "LANDLORD_CORRESPONDENCE",
  "LETTING_AGENT_CORRESPONDENCE",
  "BANK_OR_PAYMENT_RECORD",
  "IDENTITY_DOCUMENT",
  "OTHER_SUPPORTING_EVIDENCE",
] as const;

export type EvidenceRequirementType = (typeof evidenceRequirementTypes)[number];
export type EvidenceRequirementStatus = "REQUESTED" | "UPLOADED" | "UNDER_REVIEW" | "ACCEPTED" | "MORE_INFORMATION_REQUIRED" | "WAIVED";
export type EvidenceRequirementPriority = "LOW" | "NORMAL" | "HIGH";
export const evidenceRequirementPriorities = ["LOW", "NORMAL", "HIGH"] as const;
export type DocumentCategory = "TENANCY_AGREEMENT" | "DEPOSIT_PAYMENT" | "DEPOSIT_PROTECTION" | "PRESCRIBED_INFORMATION" | "SCHEME_CORRESPONDENCE" | "LANDLORD_CORRESPONDENCE" | "LETTING_AGENT_CORRESPONDENCE" | "FINANCIAL_RECORD" | "IDENTITY" | "OTHER_SUPPORTING_EVIDENCE";
export const documentCategories = ["TENANCY_AGREEMENT", "DEPOSIT_PAYMENT", "DEPOSIT_PROTECTION", "PRESCRIBED_INFORMATION", "SCHEME_CORRESPONDENCE", "LANDLORD_CORRESPONDENCE", "LETTING_AGENT_CORRESPONDENCE", "FINANCIAL_RECORD", "IDENTITY", "OTHER_SUPPORTING_EVIDENCE"] as const;

export const evidenceRequirementConfig: Readonly<Record<EvidenceRequirementType, {
  id: EvidenceRequirementType;
  label: string;
  shortLabel: string;
  description: string;
  documentCategory: DocumentCategory;
  typicalReason: string;
  sensitivity: "standard" | "sensitive";
  concept: "agreement" | "payment" | "protection" | "information" | "correspondence" | "identity" | "supporting";
  sortOrder: number;
}>> = {
  TENANCY_AGREEMENT: { id: "TENANCY_AGREEMENT", label: "Tenancy agreement", shortLabel: "Tenancy agreement", description: "The agreement and any renewals or amendments relevant to the tenancy.", documentCategory: "TENANCY_AGREEMENT", typicalReason: "Helps establish the tenancy context.", sensitivity: "standard", concept: "agreement", sortOrder: 1 },
  DEPOSIT_PAYMENT_EVIDENCE: { id: "DEPOSIT_PAYMENT_EVIDENCE", label: "Deposit payment evidence", shortLabel: "Deposit payment", description: "A record showing the deposit amount and when it was paid.", documentCategory: "DEPOSIT_PAYMENT", typicalReason: "Helps establish the deposit payment and timing.", sensitivity: "sensitive", concept: "payment", sortOrder: 2 },
  DEPOSIT_PROTECTION_CERTIFICATE: { id: "DEPOSIT_PROTECTION_CERTIFICATE", label: "Deposit protection certificate", shortLabel: "Protection certificate", description: "A certificate, reference or record from a deposit protection scheme.", documentCategory: "DEPOSIT_PROTECTION", typicalReason: "Helps clarify what protection information is available.", sensitivity: "standard", concept: "protection", sortOrder: 3 },
  PRESCRIBED_INFORMATION: { id: "PRESCRIBED_INFORMATION", label: "Prescribed information", shortLabel: "Prescribed information", description: "Information you received about how the deposit was protected.", documentCategory: "PRESCRIBED_INFORMATION", typicalReason: "Helps review the information provided about deposit protection.", sensitivity: "standard", concept: "information", sortOrder: 4 },
  SCHEME_CORRESPONDENCE: { id: "SCHEME_CORRESPONDENCE", label: "Scheme correspondence", shortLabel: "Scheme correspondence", description: "Messages or letters from a deposit protection scheme.", documentCategory: "SCHEME_CORRESPONDENCE", typicalReason: "May clarify scheme records or protection history.", sensitivity: "standard", concept: "correspondence", sortOrder: 5 },
  LANDLORD_CORRESPONDENCE: { id: "LANDLORD_CORRESPONDENCE", label: "Landlord correspondence", shortLabel: "Landlord correspondence", description: "Messages or letters exchanged with a landlord about the tenancy or deposit.", documentCategory: "LANDLORD_CORRESPONDENCE", typicalReason: "May provide context about what was communicated.", sensitivity: "standard", concept: "correspondence", sortOrder: 6 },
  LETTING_AGENT_CORRESPONDENCE: { id: "LETTING_AGENT_CORRESPONDENCE", label: "Letting-agent correspondence", shortLabel: "Agent correspondence", description: "Messages or letters exchanged with a letting agent.", documentCategory: "LETTING_AGENT_CORRESPONDENCE", typicalReason: "May provide context about the agent’s communications.", sensitivity: "standard", concept: "correspondence", sortOrder: 7 },
  BANK_OR_PAYMENT_RECORD: { id: "BANK_OR_PAYMENT_RECORD", label: "Bank or payment record", shortLabel: "Payment record", description: "A bank or payment record relevant to the deposit or tenancy.", documentCategory: "FINANCIAL_RECORD", typicalReason: "May support a payment date or amount.", sensitivity: "sensitive", concept: "payment", sortOrder: 8 },
  IDENTITY_DOCUMENT: { id: "IDENTITY_DOCUMENT", label: "Identity document", shortLabel: "Identity", description: "An identity record if one is specifically requested later.", documentCategory: "IDENTITY", typicalReason: "May be relevant to a later verified client action.", sensitivity: "sensitive", concept: "identity", sortOrder: 9 },
  OTHER_SUPPORTING_EVIDENCE: { id: "OTHER_SUPPORTING_EVIDENCE", label: "Other supporting evidence", shortLabel: "Other evidence", description: "Other records that may help explain the claim circumstances.", documentCategory: "OTHER_SUPPORTING_EVIDENCE", typicalReason: "Allows relevant supporting context to be recorded.", sensitivity: "standard", concept: "supporting", sortOrder: 10 },
};

export const documentCategoryConfig: Readonly<Record<DocumentCategory, { label: string; shortLabel: string }>> = {
  TENANCY_AGREEMENT: { label: "Tenancy agreement", shortLabel: "Tenancy" },
  DEPOSIT_PAYMENT: { label: "Deposit payment", shortLabel: "Deposit payment" },
  DEPOSIT_PROTECTION: { label: "Deposit protection", shortLabel: "Protection" },
  PRESCRIBED_INFORMATION: { label: "Prescribed information", shortLabel: "Prescribed information" },
  SCHEME_CORRESPONDENCE: { label: "Scheme correspondence", shortLabel: "Scheme correspondence" },
  LANDLORD_CORRESPONDENCE: { label: "Landlord correspondence", shortLabel: "Landlord correspondence" },
  LETTING_AGENT_CORRESPONDENCE: { label: "Letting-agent correspondence", shortLabel: "Agent correspondence" },
  FINANCIAL_RECORD: { label: "Financial or payment record", shortLabel: "Financial record" },
  IDENTITY: { label: "Identity", shortLabel: "Identity" },
  OTHER_SUPPORTING_EVIDENCE: { label: "Other supporting evidence", shortLabel: "Other evidence" },
};

export const evidenceRequirementStatuses: readonly EvidenceRequirementStatus[] = ["REQUESTED", "UPLOADED", "UNDER_REVIEW", "ACCEPTED", "MORE_INFORMATION_REQUIRED", "WAIVED"];
export const documentStatuses = ["PENDING_UPLOAD", "UPLOADED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "REPLACEMENT_REQUESTED"] as const;
export type DocumentStatus = (typeof documentStatuses)[number];
export type DocumentSecurityStatus = "PENDING_VALIDATION" | "VALIDATED" | "SECURITY_REVIEW_REQUIRED" | "REJECTED";

export const documentSecurityStatuses = ["PENDING_VALIDATION", "VALIDATED", "SECURITY_REVIEW_REQUIRED", "REJECTED"] as const;
export const documentSecurityStatusLabels: Readonly<Record<DocumentSecurityStatus, string>> = {
  PENDING_VALIDATION: "Processing",
  VALIDATED: "File type validated",
  SECURITY_REVIEW_REQUIRED: "Security review required",
  REJECTED: "Validation failed",
};

export const documentUploadStatuses = ["AUTHORIZED", "FINALIZING", "FINALIZED", "EXPIRED", "REJECTED"] as const;
export type DocumentUploadStatus = (typeof documentUploadStatuses)[number];

export const DOCUMENT_MAX_SIZE_BYTES = 15 * 1024 * 1024;
export const DOCUMENT_MAX_SIZE_LABEL = "15 MB";
export const UPLOAD_URL_EXPIRY_SECONDS = 10 * 60;
export const DOWNLOAD_URL_EXPIRY_SECONDS = 3 * 60;

export const supportedDocumentTypes = {
  "application/pdf": { extension: ".pdf", label: "PDF", signature: "PDF" },
  "image/jpeg": { extension: ".jpg", alternateExtensions: [".jpeg"], label: "JPEG", signature: "JPEG" },
  "image/png": { extension: ".png", label: "PNG", signature: "PNG" },
} as const;

export type SupportedDocumentMimeType = keyof typeof supportedDocumentTypes;

export function isSupportedDocumentMimeType(value: string): value is SupportedDocumentMimeType {
  return value in supportedDocumentTypes;
}

export function isDocumentCategory(value: string): value is DocumentCategory {
  return documentCategories.includes(value as DocumentCategory);
}

export const evidenceRequirementStatusLabels: Readonly<Record<EvidenceRequirementStatus, string>> = {
  REQUESTED: "Requested",
  UPLOADED: "Provided",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Recorded as accepted",
  MORE_INFORMATION_REQUIRED: "More information required",
  WAIVED: "Waived",
};

export const evidenceCompletenessStateConfig = {
  NOT_STARTED: { label: "Not started", description: "No evidence has been requested from you at this stage." },
  IN_PROGRESS: { label: "In progress", description: "Some supporting information has been provided, with more still to be reviewed." },
  READY_FOR_REVIEW: { label: "Ready for review", description: "The currently requested items have been provided and are ready for review." },
  REVIEWING: { label: "Under review", description: "Provided supporting information is currently being reviewed." },
  ACTION_REQUIRED: { label: "Needs your attention", description: "One or more requested items may need information or action from you." },
  COMPLETE: { label: "Complete", description: "All currently required evidence items have been recorded as accepted for this workflow stage." },
} as const;

export const documentStatusLabels: Readonly<Record<DocumentStatus, string>> = {
  PENDING_UPLOAD: "Awaiting upload",
  UPLOADED: "Uploaded",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Recorded as accepted",
  REJECTED: "Not accepted for review",
  REPLACEMENT_REQUESTED: "Replacement requested",
};

export const evidenceRequirementTransitions: Readonly<Record<EvidenceRequirementStatus, readonly EvidenceRequirementStatus[]>> = {
  REQUESTED: ["UPLOADED", "MORE_INFORMATION_REQUIRED", "WAIVED"],
  UPLOADED: ["UNDER_REVIEW", "WAIVED"],
  UNDER_REVIEW: ["ACCEPTED", "MORE_INFORMATION_REQUIRED", "WAIVED"],
  ACCEPTED: ["MORE_INFORMATION_REQUIRED", "WAIVED"],
  MORE_INFORMATION_REQUIRED: ["UPLOADED", "WAIVED"],
  WAIVED: [],
};

export const documentStatusTransitions: Readonly<Record<DocumentStatus, readonly DocumentStatus[]>> = {
  PENDING_UPLOAD: ["UPLOADED"],
  UPLOADED: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["ACCEPTED", "REPLACEMENT_REQUESTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
  REPLACEMENT_REQUESTED: [],
};

export function isEvidenceRequirementType(value: string): value is EvidenceRequirementType {
  return value in evidenceRequirementConfig;
}

export function isEvidenceRequirementStatus(value: string): value is EvidenceRequirementStatus {
  return evidenceRequirementStatuses.includes(value as EvidenceRequirementStatus);
}

export function canTransitionEvidenceRequirement(from: EvidenceRequirementStatus, to: EvidenceRequirementStatus) {
  return evidenceRequirementTransitions[from].includes(to);
}

export function isEvidenceRequirementPriority(value: string): value is EvidenceRequirementPriority {
  return evidenceRequirementPriorities.includes(value as EvidenceRequirementPriority);
}

export function canTransitionDocumentStatus(from: DocumentStatus, to: DocumentStatus) {
  return documentStatusTransitions[from].includes(to);
}
