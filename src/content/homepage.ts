// LEGAL_REVIEW_REQUIRED: Phase 1B content is deliberately qualified product copy.
// It is not a substitute for final jurisdiction-specific legal review.

export const depositQuestions = [
  {
    index: "01",
    question: "Was the deposit protected?",
    explanation:
      "A protection record, certificate or scheme confirmation may help establish what happened after the deposit was paid.",
  },
  {
    index: "02",
    question: "Was it protected within the required timeframe?",
    explanation:
      "The relevant dates and the circumstances of the tenancy may need to be considered together before any conclusion is reached.",
  },
  {
    index: "03",
    question: "Were the required details provided?",
    explanation:
      "The information a renter received about the deposit and scheme may be relevant to a fuller assessment.",
  },
] as const;

export const depositIssues = [
  {
    index: "01",
    title: "Deposit not protected",
    description:
      "You cannot confirm that the deposit was placed in an authorised scheme, or the available records appear incomplete.",
    href: "/deposit-claims/not-protected",
  },
  {
    index: "02",
    title: "Deposit protected late",
    description:
      "The protection date may have fallen outside the timeframe relevant to your tenancy and may warrant further assessment.",
    href: "/deposit-claims/late-protection",
  },
  {
    index: "03",
    title: "Missing prescribed information",
    description:
      "You may not have received the required deposit and scheme information, or what you received may be incomplete.",
    href: "/deposit-claims/missing-information",
  },
  {
    index: "04",
    title: "Cannot identify the scheme",
    description:
      "Scheme searches and tenancy records have not yet shown where, or whether, the deposit was protected.",
    href: "/deposit-claims/cant-find-my-deposit",
  },
] as const;

export const claimProcess = [
  ["01", "Initial check", "Start with the tenancy, the deposit and what you remember receiving."],
  ["02", "Evidence", "Bring together the documents, messages and payment records that may be relevant."],
  ["03", "Assessment", "The circumstances and available evidence can be considered before a route is proposed."],
  ["04", "Claim preparation", "If appropriate, the information needed for the next stage can be organised clearly."],
  ["05", "Progress & updates", "Requests, responsibilities and changes in stage stay visible in one place."],
  ["06", "Outcome / resolution", "The final route depends on the individual circumstances and review of the claim."],
] as const;

export const evidenceCategories = [
  "Tenancy agreement",
  "Deposit payment",
  "Deposit information",
  "Scheme correspondence",
  "Landlord / agent communication",
] as const;

export const exampleStatuses = [
  { label: "Initial review", state: "complete" },
  { label: "Evidence requested", state: "complete" },
  { label: "Evidence received", state: "complete" },
  { label: "Assessment", state: "current" },
  { label: "Next step", state: "upcoming" },
] as const;

export const knowledgeGuides = [
  {
    category: "Deposit protection",
    title: "Understanding tenancy deposit protection",
    description: "A foundational guide to the purpose of deposit protection and the records a renter may encounter.",
    href: "/deposit-claims",
  },
  {
    category: "Prescribed information",
    title: "What is prescribed information?",
    description: "A plain-language introduction to the information connected with a protected deposit.",
    href: "/deposit-claims/missing-information",
  },
  {
    category: "Evidence",
    title: "What evidence should I keep?",
    description: "A practical starting point for organising tenancy, payment and correspondence records.",
    href: "/guides/deposit-protection",
  },
  {
    category: "Tenant guide",
    title: "What if I cannot find my deposit scheme?",
    description: "Useful checks when the available paperwork does not make the protection position clear.",
    href: "/deposit-claims/cant-find-my-deposit",
  },
] as const;

export const principles = [
  ["Clear communication", "Plain explanations and visible next actions, without assuming renters already know the legal language."],
  ["Evidence-led assessment", "The circumstances and available records guide the assessment, not a pre-determined promise."],
  ["Visible progress", "Stages, requests and updates are designed to stay accessible throughout the process."],
  ["Secure organisation", "Relevant documents can be brought together without being lost across separate inbox threads."],
  ["Renter-focused guidance", "Each interaction starts with what the renter knows and explains what may matter next."],
] as const;

export const homepageFaqs = [
  {
    question: "What is tenancy deposit protection?",
    answer:
      "Deposit protection is a framework for safeguarding certain tenancy deposits and providing renters with related information. The rules that apply can depend on the location, tenancy and circumstances, so a specific situation may need review.",
  },
  {
    question: "How do I know whether my deposit was protected?",
    answer:
      "A deposit certificate, prescribed information or confirmation from an authorised scheme may help. If those records are missing, scheme searches and other tenancy evidence may provide a useful starting point.",
  },
  {
    question: "What information should I have received?",
    answer:
      "The information required can depend on the applicable rules and circumstances. It may include details about the scheme, the deposit and how it is handled. Claims Bridge will help organise what you received for assessment.",
  },
  {
    question: "What if I no longer live at the property?",
    answer:
      "A former tenancy may still warrant an initial check depending on its circumstances. Keep any agreement, payment record and correspondence you still have and use the eligibility pathway as a starting point.",
  },
  {
    question: "What evidence might be useful?",
    answer:
      "A tenancy agreement, proof of the deposit payment, deposit or scheme information, and communications with the landlord or agent may all be useful. The exact evidence required will depend on the matter.",
  },
  {
    question: "Can I track my claim online?",
    answer:
      "The Claims Bridge client platform is being designed to show stages, requests, documents, messages and updates in one place. Account functionality will be introduced in a later product phase.",
  },
] as const;
