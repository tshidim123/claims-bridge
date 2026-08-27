import type { SectionDefinition } from "@/lib/eligibility/types";

// LEGAL_REVIEW_REQUIRED: All assessment wording is preliminary product copy.
// Keep jurisdiction rules and legal-sensitive language here so they can be reviewed
// without rewriting the assessment components.

export const eligibilitySections: SectionDefinition[] = [
  {
    id: "property",
    index: "01",
    label: "Your property",
    description: "Where the rented property was located.",
  },
  {
    id: "tenancy",
    index: "02",
    label: "Your tenancy",
    description: "Property location and the broad shape of the tenancy.",
  },
  {
    id: "deposit",
    index: "03",
    label: "Your deposit",
    description: "What was paid, when, and who received it.",
  },
  {
    id: "protection",
    index: "04",
    label: "Deposit protection",
    description: "What you were told and any scheme record you can identify.",
  },
  {
    id: "information",
    index: "05",
    label: "Information received",
    description: "The deposit and scheme information you remember receiving.",
  },
  {
    id: "evidence",
    index: "06",
    label: "Evidence you have",
    description: "A quick inventory only—nothing is uploaded here.",
  },
];

export const eligibilityIntro = {
  eyebrow: "Preliminary tenancy deposit assessment",
  title: "Start with what you know. We’ll connect the rest.",
  description:
    "A guided initial check of your tenancy, deposit and available records. It is not legal advice and does not decide whether you have a claim.",
  startLabel: "Start the initial check",
  timeLabel: "Usually takes around 4–6 minutes",
  privacyTitle: "Designed to ask for less",
  privacyBody:
    "This phase does not ask for identity documents, bank login details, payment card information or document uploads.",
} as const;

export const assessmentReassurance = {
  heading: "Your assessment, not a legal decision",
  body:
    "Your answers organise a preliminary assessment. Any potential claim would still require individual review of the circumstances and evidence.",
  session:
    "Your answers stay in this page while you work. No account is created and secure save/resume will be introduced in a later phase.",
} as const;

export const jurisdictionSupport = {
  england: "supported",
  wales: "individual-review",
  scotland: "outside-current-scope",
  northern_ireland: "outside-current-scope",
  outside_uk: "outside-current-scope",
  not_sure: "more-information",
} as const;

export const evidenceDisclaimer =
  "Missing a document does not necessarily mean you cannot proceed. A fuller review may identify other useful records or ways to verify what happened.";
