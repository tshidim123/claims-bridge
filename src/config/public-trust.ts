// Only include product facts that are verifiable from the current platform.
export const verifiedTrustFacts = [
  { id: "account", label: "Secure account access", description: "Claim information is available through authenticated client routes." },
  { id: "assessment", label: "Structured eligibility assessment", description: "A guided preliminary assessment helps organise the starting information." },
  { id: "tracking", label: "Claim progress tracking", description: "Clients can follow stage, timeline and next-step information after sign-in." },
  { id: "correspondence", label: "Private claim correspondence", description: "Claim-specific messages are kept inside the authenticated workspace." },
  { id: "evidence", label: "Evidence guidance", description: "Evidence requirements and supporting records can be organised in context." },
  { id: "clarity", label: "Clear next steps", description: "The product separates preliminary eligibility, claim creation and ongoing review." },
] as const;

export const publicDisclosures = {
  preliminary: { id: "preliminary", legalReviewRequired: true, text: "Eligibility results are preliminary and may require further review." },
  claimCreation: { id: "claim-creation", legalReviewRequired: true, text: "Creating a Claims Bridge claim does not establish liability or guarantee an outcome." },
  evidence: { id: "evidence", legalReviewRequired: true, text: "Additional information or supporting evidence may be required." },
  outcomes: { id: "outcomes", legalReviewRequired: true, text: "Individual circumstances vary, and the outcome of a claim cannot be guaranteed." },
} as const;

export const optionalBusinessDetails = {
  businessName: "Claims Bridge",
  supportEmail: undefined,
  generalEmail: undefined,
  phone: undefined,
  registeredAddress: undefined,
  companyNumber: undefined,
  businessHours: undefined,
} as const;

export const futureResults: readonly never[] = [];
export const futureTestimonials: readonly never[] = [];

export const securityPrinciples = [
  ["Authenticated access", "Client claim information is designed to remain behind sign-in rather than a public reference lookup."],
  ["Ownership boundaries", "Account routes resolve the signed-in client and verify ownership before returning claim information."],
  ["Private correspondence", "Messages and notifications are presented inside the account rather than exposed through public pages."],
  ["Controlled document architecture", "Document functionality is designed for private authenticated access; live file storage depends on separate configuration."],
  ["Data minimisation", "Public pages avoid private claim details, storage internals and unnecessary personal information."],
] as const;

export const transparencySections = [
  ["Preliminary assessment", "The eligibility assessment organises the information provided and produces an initial indication. It is not a legal determination."],
  ["A separate decision", "A saved assessment does not automatically become a claim. The client chooses whether to proceed after reviewing the result."],
  ["Further review", "A claim may require more information, supporting evidence or communication as its circumstances are considered."],
  ["Visible progress", "The client workspace can show a claim stage, timeline, next steps, evidence state, messages and notifications."],
  ["No promised outcome", "A claim record supports an organised workflow. It does not establish liability, court proceedings or compensation."],
] as const;
