import type { EligibilityQuestion } from "@/lib/eligibility/types";

const yesNoUnsure = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "I’m not sure" },
];

export const eligibilityQuestions = [
  {
    id: "jurisdiction",
    section: "property",
    title: "Where was the rented property?",
    description:
      "Deposit rules and the services available can differ across the UK. Choose the location of the property, not where you live now.",
    legalText: "Jurisdiction is used to select an appropriate preliminary route only.",
    fieldType: "single-choice",
    options: [
      { value: "england", label: "England", description: "Continue through the current assessment route." },
      { value: "wales", label: "Wales", description: "Continue with jurisdiction-aware review wording." },
      { value: "scotland", label: "Scotland", description: "We’ll direct you to the appropriate next step." },
      { value: "northern_ireland", label: "Northern Ireland", description: "We’ll direct you to the appropriate next step." },
      { value: "outside_uk", label: "Outside the UK" },
      { value: "custom", label: "Other / my location is not listed", description: "Enter the town, city, borough or local area." },
      { value: "not_sure", label: "I’m not sure" },
    ],
    required: true,
    validation: { message: "Choose where the rented property was located." },
    nextStep: [
      {
        when: {
          questionId: "jurisdiction",
          operator: "in",
          values: ["scotland", "northern_ireland", "outside_uk", "not_sure"],
        },
        next: "jurisdiction_route",
      },
    ],
    reviewLabel: "Property location",
    analyticsEventId: "eligibility_jurisdiction_answered",
    legalReview: true,
    whyWeAsk:
      "Tenancy deposit frameworks are jurisdiction-specific. Establishing location early prevents irrelevant questions and over-broad conclusions.",
  },
  {
    id: "custom_location",
    section: "property",
    title: "Where is the property located?",
    description: "Enter the town, city, borough or local area where the rented property is located. You do not need to enter the full address at this stage.",
    fieldType: "text",
    inputMode: "text",
    placeholder: "For example, Newcastle-under-Lyme",
    required: true,
    visibility: { all: [{ questionId: "jurisdiction", operator: "equals", value: "custom" }] },
    validation: { message: "Enter a town, city, borough or local area using letters, spaces, hyphens, apostrophes or periods." },
    reviewLabel: "Location",
    analyticsEventId: "eligibility_custom_location_answered",
    legalReview: true,
    whyWeAsk: "A place name lets Claims Bridge keep your preliminary assessment context clear without asking for a full property address.",
  },
  {
    id: "jurisdiction_route",
    section: "tenancy",
    title: "This location needs a different route.",
    description:
      "We will keep this assessment short and show a qualified next step. You do not need to complete questions based on rules that may not apply.",
    legalText:
      "Claims Bridge’s current service scope is configurable and does not imply that no rights or remedies exist in this jurisdiction.",
    fieldType: "informational",
    continueLabel: "Review this route",
    required: false,
    visibility: {
      any: [
        {
          questionId: "jurisdiction",
          operator: "in",
          values: ["scotland", "northern_ireland", "outside_uk", "not_sure"],
        },
      ],
    },
    nextStep: [
      {
        when: {
          questionId: "jurisdiction",
          operator: "in",
          values: ["scotland", "northern_ireland", "outside_uk", "not_sure"],
        },
        next: "review",
      },
    ],
    analyticsEventId: "eligibility_jurisdiction_route_viewed",
    legalReview: true,
    whyWeAsk:
      "A shorter route avoids asking you to interpret questions built around a different legal framework.",
  },
  {
    id: "main_home",
    section: "tenancy",
    title: "Was this your main rented home?",
    description:
      "Choose the answer that best reflects how you used the property during the tenancy.",
    fieldType: "yes-no",
    options: yesNoUnsure,
    required: true,
    validation: { message: "Choose an answer, including ‘I’m not sure’ if needed." },
    reviewLabel: "Main rented home",
    analyticsEventId: "eligibility_main_home_answered",
    legalReview: true,
    whyWeAsk:
      "The type and use of a tenancy can affect which deposit requirements are relevant. This answer is not decisive by itself.",
  },
  {
    id: "tenancy_party",
    section: "tenancy",
    title: "Who arranged or managed the tenancy?",
    description:
      "This helps identify where deposit records or communications may be held. Choose the closest answer.",
    fieldType: "single-choice",
    options: [
      { value: "landlord", label: "The landlord" },
      { value: "agent", label: "A letting agent" },
      { value: "both", label: "Both were involved" },
      { value: "other", label: "Someone else" },
      { value: "not_sure", label: "I’m not sure" },
    ],
    required: true,
    validation: { message: "Choose who arranged or managed the tenancy." },
    evidenceImplications: ["landlord_agent_messages"],
    reviewLabel: "Tenancy managed by",
    analyticsEventId: "eligibility_tenancy_party_answered",
    legalReview: false,
    whyWeAsk:
      "The person or organisation that handled the tenancy may also have received the deposit or sent protection information.",
  },
  {
    id: "tenancy_start",
    section: "tenancy",
    title: "When did the tenancy start?",
    description:
      "Use your best estimate. If you cannot remember, you can continue without entering a date.",
    fieldType: "date",
    required: false,
    validation: { allowFuture: false, message: "Enter a valid tenancy start date that is not in the future." },
    reviewLabel: "Tenancy start",
    analyticsEventId: "eligibility_tenancy_start_answered",
    legalReview: true,
    whyWeAsk:
      "Dates can help place deposit events in context. A later review would compare the available records rather than rely on memory alone.",
  },
  {
    id: "deposit_paid",
    section: "deposit",
    title: "Did you pay a tenancy deposit?",
    description:
      "Think about a refundable amount held against the tenancy, rather than rent paid in advance. Choose ‘I’m not sure’ if the payment was described differently.",
    legalText: "This answer does not determine how a payment would be characterised legally.",
    fieldType: "yes-no",
    options: yesNoUnsure,
    required: true,
    validation: { message: "Choose whether you paid a tenancy deposit." },
    nextStep: [
      {
        when: { questionId: "deposit_paid", operator: "equals", value: "no" },
        next: "review",
      },
    ],
    evidenceImplications: ["deposit_payment"],
    reviewLabel: "Deposit paid",
    analyticsEventId: "eligibility_deposit_paid_answered",
    legalReview: true,
    whyWeAsk:
      "Deposit protection questions generally depend on whether a relevant payment was made. We do not automatically treat every upfront payment as a deposit.",
  },
  {
    id: "deposit_uncertain",
    section: "deposit",
    title: "It is fine not to know how the payment was described.",
    description:
      "You can continue with the information you have. A tenancy agreement, payment reference or message may later help clarify whether the payment was a deposit.",
    fieldType: "informational",
    continueLabel: "Continue with what I know",
    required: false,
    visibility: {
      all: [{ questionId: "deposit_paid", operator: "equals", value: "not_sure" }],
    },
    evidenceImplications: ["tenancy_agreement", "deposit_payment", "landlord_agent_messages"],
    analyticsEventId: "eligibility_deposit_uncertain_viewed",
    legalReview: true,
    whyWeAsk:
      "Uncertainty should lead to evidence gathering and individual review, not an automatic rejection.",
  },
  {
    id: "deposit_amount",
    section: "deposit",
    title: "Approximately how much was the deposit?",
    description:
      "Enter pounds only. Leave this blank if you cannot remember—the amount is useful context but is not used to calculate compensation here.",
    fieldType: "money",
    inputMode: "decimal",
    placeholder: "For example, 950",
    required: false,
    validation: { min: 0.01, max: 100000, message: "Enter a deposit amount between £0.01 and £100,000." },
    visibility: { all: [{ questionId: "deposit_paid", operator: "equals", value: "yes" }] },
    evidenceImplications: ["deposit_payment"],
    reviewLabel: "Approximate deposit",
    analyticsEventId: "eligibility_deposit_amount_answered",
    legalReview: false,
    whyWeAsk:
      "The amount can help identify the matching payment record. This assessment does not value a claim or calculate an award.",
  },
  {
    id: "deposit_paid_date",
    section: "deposit",
    title: "About when was the deposit paid?",
    description:
      "Use the closest date you can remember, or continue without a date if you are unsure.",
    fieldType: "date",
    required: false,
    validation: { allowFuture: false, message: "Enter a valid deposit payment date that is not in the future." },
    visibility: { all: [{ questionId: "deposit_paid", operator: "equals", value: "yes" }] },
    evidenceImplications: ["deposit_payment"],
    reviewLabel: "Deposit payment date",
    analyticsEventId: "eligibility_deposit_date_answered",
    legalReview: true,
    whyWeAsk:
      "A payment date can later be compared with registration and information dates, subject to the rules that apply to the tenancy.",
  },
  {
    id: "deposit_recipient",
    section: "deposit",
    title: "Who received the deposit?",
    description: "Choose the closest answer based on the payment record or what you remember.",
    fieldType: "single-choice",
    options: [
      { value: "landlord", label: "The landlord" },
      { value: "agent", label: "A letting agent" },
      { value: "other", label: "Someone else" },
      { value: "not_sure", label: "I’m not sure" },
    ],
    required: true,
    validation: { message: "Choose who received the deposit." },
    visibility: { all: [{ questionId: "deposit_paid", operator: "equals", value: "yes" }] },
    evidenceImplications: ["deposit_payment", "landlord_agent_messages"],
    reviewLabel: "Deposit received by",
    analyticsEventId: "eligibility_deposit_recipient_answered",
    legalReview: false,
    whyWeAsk:
      "This can help identify who may hold the payment and protection records. It is not a conclusion about responsibility.",
  },
  {
    id: "protected_told",
    section: "protection",
    title: "Were you told the deposit was protected?",
    description:
      "This could have been in a certificate, email, tenancy pack or message. Not remembering is a valid answer.",
    fieldType: "yes-no",
    options: yesNoUnsure,
    required: true,
    validation: { message: "Choose what you remember being told." },
    visibility: { all: [{ questionId: "deposit_paid", operator: "equals", value: "yes" }] },
    evidenceImplications: ["protection_certificate", "scheme_correspondence"],
    reviewLabel: "Told deposit was protected",
    analyticsEventId: "eligibility_protection_told_answered",
    legalReview: true,
    whyWeAsk:
      "What you were told helps shape the evidence search. It does not prove by itself whether protection did or did not occur.",
  },
  {
    id: "protection_scheme",
    section: "protection",
    title: "Which scheme were you told about?",
    description: "Choose the name you recognise. If the paperwork is unclear, use ‘I’m not sure’.",
    fieldType: "single-choice",
    options: [
      { value: "dps", label: "Deposit Protection Service (DPS)" },
      { value: "tds", label: "Tenancy Deposit Scheme (TDS)" },
      { value: "mydeposits", label: "mydeposits" },
      { value: "other", label: "Another scheme" },
      { value: "not_sure", label: "I’m not sure" },
    ],
    required: true,
    validation: { message: "Choose a scheme, including ‘I’m not sure’ if needed." },
    visibility: {
      all: [
        { questionId: "deposit_paid", operator: "equals", value: "yes" },
        { questionId: "protected_told", operator: "equals", value: "yes" },
      ],
    },
    evidenceImplications: ["protection_certificate", "scheme_correspondence"],
    reviewLabel: "Protection scheme",
    analyticsEventId: "eligibility_scheme_answered",
    legalReview: false,
    whyWeAsk:
      "A scheme name can make later record checks more direct. Not knowing the scheme does not prevent you from continuing.",
  },
  {
    id: "registration_evidence",
    section: "protection",
    title: "Can you find evidence of scheme registration?",
    description:
      "This might be a certificate, reference number, scheme email or search result. No document is uploaded during this check.",
    fieldType: "yes-no",
    options: yesNoUnsure,
    required: true,
    validation: { message: "Choose whether you can find a registration record." },
    visibility: { all: [{ questionId: "deposit_paid", operator: "equals", value: "yes" }] },
    evidenceImplications: ["protection_certificate", "scheme_correspondence"],
    reviewLabel: "Registration evidence found",
    analyticsEventId: "eligibility_registration_evidence_answered",
    legalReview: true,
    whyWeAsk:
      "A registration record may help establish what happened. Its absence from your files does not by itself establish that the deposit was unprotected.",
  },
  {
    id: "protection_timing",
    section: "protection",
    title: "When do you remember being told?",
    description:
      "Choose the broad timeframe you remember. A later review would verify dates against the records and applicable rules.",
    fieldType: "single-choice",
    options: [
      { value: "within_30_days", label: "Within about 30 days of payment" },
      { value: "later", label: "Later than that" },
      { value: "not_sure", label: "I’m not sure" },
    ],
    required: true,
    validation: { message: "Choose the timeframe you remember." },
    visibility: {
      all: [
        { questionId: "deposit_paid", operator: "equals", value: "yes" },
        { questionId: "protected_told", operator: "equals", value: "yes" },
      ],
    },
    reviewLabel: "Protection information timing",
    analyticsEventId: "eligibility_protection_timing_answered",
    legalReview: true,
    whyWeAsk:
      "Timing may be relevant, but this broad memory-based answer is only a prompt for closer assessment—not a legal finding.",
  },
  {
    id: "deposit_information",
    section: "information",
    title: "Were you given information about the deposit protection?",
    description:
      "This may have included scheme details, how the deposit is handled, and information about what happens at the end of the tenancy.",
    fieldType: "yes-no",
    options: yesNoUnsure,
    required: true,
    validation: { message: "Choose what you remember receiving." },
    visibility: { all: [{ questionId: "deposit_paid", operator: "equals", value: "yes" }] },
    evidenceImplications: ["prescribed_information"],
    reviewLabel: "Deposit information received",
    analyticsEventId: "eligibility_deposit_information_answered",
    legalReview: true,
    whyWeAsk:
      "The content, timing and delivery of deposit information may need individual review. A ‘yes’ or ‘no’ answer is not conclusive on its own.",
  },
  {
    id: "information_held",
    section: "information",
    title: "Do you still have that information?",
    description: "It may be in a tenancy pack, email attachment or online account. Choose ‘I’m not sure’ if you have not searched yet.",
    fieldType: "yes-no",
    options: yesNoUnsure,
    required: true,
    validation: { message: "Choose whether you still have the information." },
    visibility: {
      all: [
        { questionId: "deposit_paid", operator: "equals", value: "yes" },
        { questionId: "deposit_information", operator: "equals", value: "yes" },
      ],
    },
    evidenceImplications: ["prescribed_information"],
    reviewLabel: "Deposit information still held",
    analyticsEventId: "eligibility_information_held_answered",
    legalReview: false,
    whyWeAsk:
      "Knowing what is already available helps produce a more useful evidence checklist. Missing paperwork does not automatically stop a review.",
  },
  {
    id: "tenancy_ended",
    section: "tenancy",
    title: "Has the tenancy ended?",
    description: "Choose ‘No’ if you still rent the property. If the position is changing or unclear, choose ‘I’m not sure’.",
    fieldType: "yes-no",
    options: yesNoUnsure,
    required: true,
    validation: { message: "Choose the current tenancy status." },
    visibility: {
      any: [
        { questionId: "deposit_paid", operator: "equals", value: "yes" },
        { questionId: "deposit_paid", operator: "equals", value: "not_sure" },
      ],
    },
    reviewLabel: "Tenancy ended",
    analyticsEventId: "eligibility_tenancy_status_answered",
    legalReview: true,
    whyWeAsk:
      "An ongoing tenancy and a former tenancy can require different practical next steps. Neither answer determines the outcome alone.",
  },
  {
    id: "tenancy_end",
    section: "tenancy",
    title: "When did the tenancy end?",
    description: "Use your best estimate, or continue without a date if you cannot remember.",
    fieldType: "date",
    required: false,
    validation: { allowFuture: false, message: "Enter a valid tenancy end date that is not in the future." },
    visibility: { all: [{ questionId: "tenancy_ended", operator: "equals", value: "yes" }] },
    reviewLabel: "Tenancy end",
    analyticsEventId: "eligibility_tenancy_end_answered",
    legalReview: true,
    whyWeAsk:
      "The end date helps place later communications and deposit events in sequence. Records would be needed for any formal assessment.",
  },
  {
    id: "evidence_available",
    section: "evidence",
    title: "Which records do you currently have?",
    description:
      "Select everything you can readily find. This is only an inventory—documents are not uploaded and having none does not reject your route.",
    fieldType: "multiple-choice",
    options: [
      { value: "tenancy_agreement", label: "Tenancy agreement" },
      { value: "deposit_payment", label: "Bank or payment record" },
      { value: "protection_certificate", label: "Protection certificate" },
      { value: "prescribed_information", label: "Deposit / prescribed information" },
      { value: "landlord_agent_messages", label: "Landlord or agent emails / messages" },
      { value: "scheme_correspondence", label: "Scheme correspondence" },
      { value: "other_evidence", label: "Other tenancy evidence" },
      { value: "none", label: "I do not have any of these right now" },
    ],
    exclusiveOption: "none",
    required: true,
    validation: { min: 1, message: "Select the records you have, or choose that you do not have any right now." },
    visibility: {
      any: [
        { questionId: "deposit_paid", operator: "equals", value: "yes" },
        { questionId: "deposit_paid", operator: "equals", value: "not_sure" },
      ],
    },
    evidenceImplications: [
      "tenancy_agreement",
      "deposit_payment",
      "protection_certificate",
      "prescribed_information",
      "landlord_agent_messages",
      "scheme_correspondence",
      "other_evidence",
    ],
    reviewLabel: "Records currently available",
    analyticsEventId: "eligibility_evidence_inventory_answered",
    legalReview: false,
    whyWeAsk:
      "The preliminary result can distinguish records you already have from records that may be helpful to look for next.",
  },
] satisfies EligibilityQuestion[];

// Keep the configured journey aligned with the six visible assessment stages.
const sectionOrder: Record<string, number> = {
  property: 1,
  tenancy: 2,
  deposit: 3,
  protection: 4,
  information: 5,
  evidence: 6,
};
eligibilityQuestions.sort((left, right) => sectionOrder[left.section] - sectionOrder[right.section]);

export const eligibilityQuestionMap = new Map(
  eligibilityQuestions.map((question) => [question.id, question]),
);
