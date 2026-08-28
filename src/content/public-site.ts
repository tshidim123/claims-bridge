import { legalCopy, publicScope } from "@/config/public-site";

export const processSteps = [
  ["01", "Check eligibility", "Answer a focused set of questions about the tenancy, deposit and protection information you remember."],
  ["02", "Review the preliminary result", "Use the result as an initial indication, with clear limits around what it can and cannot establish."],
  ["03", "Create a secure account", "Keep the assessment and any later claim information in an authenticated client space."],
  ["04", "Choose whether to proceed", "A saved assessment does not become a claim automatically. You decide whether to continue."],
  ["05", "Organise relevant information", "Bring together the tenancy, payment, scheme and correspondence records that may help."],
  ["06", "Follow review and preparation", "Claims Bridge can structure requests, evidence and communication as the matter develops."],
  ["07", "Track progress", "See the current stage, timeline, next steps, evidence state and secure messages in one place."],
  ["08", "Resolution or closure", "The eventual route depends on the circumstances and review. A claim record is not a promise of success."],
] as const;

export const publicStages = [
  ["01", "Submitted", "Your decision to proceed is recorded."],
  ["02", "Initial review", "The available information is considered."],
  ["03", "Evidence", "Relevant records may be requested and organised."],
  ["04", "Assessment", "The circumstances and evidence are assessed further."],
  ["05", "Preparation", "Where appropriate, information is prepared for the next route."],
  ["06", "Progress / resolution", "The claim can be tracked as work continues."],
  ["07", "Closed", "The case record reaches an appropriate endpoint."],
] as const;

export const issuePages = {
  notProtected: {
    eyebrow: "Deposit claims / 01",
    title: "When you cannot confirm your deposit was protected.",
    intro: "A missing certificate or scheme record is a reason to investigate carefully—not proof of what happened. Claims Bridge helps organise the facts before a fuller assessment.",
    signals: ["No scheme certificate or confirmation can be found", "The paperwork does not identify a protection scheme", "The deposit payment and tenancy dates are still available to check", "Landlord or agent correspondence may contain useful clues"],
    sections: [["Start with the record", "Check the tenancy agreement, deposit payment, move-in correspondence and any information received after the deposit was paid."], ["Look for the protection trail", "Scheme correspondence, certificates and prescribed information may help establish what was done and when."], ["Use an initial assessment", "The eligibility pathway can help organise what you know. Any result remains preliminary and further assessment may be required."]],
  },
  lateProtection: {
    eyebrow: "Deposit claims / 02",
    title: "When protection may have happened later than expected.",
    intro: "Timing can be an important part of understanding a deposit-protection situation. The relevant dates and tenancy circumstances need to be considered together.",
    signals: ["The protection certificate appears dated after the tenancy began", "Scheme correspondence refers to a later registration", "The date the deposit was paid is known but the protection date is unclear", "Different documents appear to show different dates"],
    sections: [["Build a simple timeline", "Keep the tenancy start, deposit payment, protection and information dates together so they can be compared accurately."], ["Do not rely on one document", "Certificates, scheme records, messages and payment evidence may each provide part of the picture."], ["Request a closer look", "Claims Bridge can help identify whether the circumstances are suitable for further assessment. It does not predetermine an outcome."]],
  },
  missingInformation: {
    eyebrow: "Deposit claims / 03",
    title: "When the deposit-protection information is missing or unclear.",
    intro: "Renters may have received several documents or messages about a protected deposit. If those records cannot be found, the absence should be investigated rather than assumed to prove liability.",
    signals: ["You do not remember receiving scheme or deposit information", "The documents you have are incomplete or undated", "The scheme is named but the related information is not available", "The information may have been sent to an old email address or portal"],
    sections: [["Search the places it may live", "Review email, tenancy folders, portals, messages and any move-in pack before concluding that records are absent."], ["Keep what is available", "Even partial documents, screenshots, dates and correspondence can help explain the position."], ["Use the eligibility route", "A guided preliminary assessment can help decide what should be checked next without treating missing paperwork as a final conclusion."]],
  },
  cantFindDeposit: {
    eyebrow: "Deposit claims / 04",
    title: "Paid a deposit, but cannot find the scheme.",
    intro: "It is common for renters to know a deposit was paid but not know where it was protected. Start with the records and names already connected to the tenancy.",
    signals: ["Search paperwork using the property and landlord or agent names", "Check old messages, email accounts and tenancy portals", "Try the scheme records or contacts identified in your documents", "Note what you searched and which details you used"],
    sections: [["Gather the anchors", "The agreement, payment record, tenancy dates and correspondence give a reliable starting point for scheme checks."], ["Allow for variations", "Names, addresses and reference formats may appear differently across a tenancy and scheme record."], ["Ask for structured help", "Claims Bridge can help organise the preliminary information and explain what may be needed for a fuller review."]],
  },
} as const;

export const faqGroups = [
  { title: "Eligibility", items: [
    ["What does the eligibility check do?", "It is a guided preliminary assessment of the tenancy, deposit and protection information you provide. It is not a legal determination or guarantee of a claim."],
    ["Do I need every document before I start?", "No. Start with what you know. The assessment can help identify which records may be useful to look for next."],
  ]},
  { title: "Deposit protection", items: [
    ["What if I cannot find my scheme?", "Review your tenancy paperwork, payment records, emails and messages first. Record what you searched and use the eligibility pathway if the position remains unclear."],
    ["Does late protection automatically mean I have a claim?", "No. Timing may warrant review, but the relevant facts and documents need to be considered together."],
  ]},
  { title: "Claim process", items: [
    ["Does an assessment automatically create a claim?", "No. A saved assessment is separate. You must explicitly choose to proceed, and further assessment may be required."],
    ["Can a claim record guarantee an outcome?", "No. It is a case and workflow record that helps organise information and communication."],
  ]},
  { title: "Evidence", items: [
    ["What information may help?", "A tenancy agreement, deposit payment evidence, scheme records, deposit information and correspondence may be useful. The relevant items depend on the circumstances."],
    ["What if a requested document is unavailable?", "Tell Claims Bridge through the available account route and keep any alternative record. Missing one document does not by itself decide the outcome."],
  ]},
  { title: "Client account", items: [
    ["What can clients see in the portal?", "Authenticated clients can see their claim stage, timeline, next steps, evidence state, secure messages and in-app notifications."],
    ["Can anyone look up my claim publicly?", "No. Claim information is available through the authenticated account experience and ownership is checked server-side."],
  ]},
  { title: "Support", items: [
    ["What is Claims Bridge not primarily for?", `The service focuses on potential tenancy-deposit protection issues, not ${publicScope.notPrimaryFor.slice(0, 2).join(" or ")}.`],
    ["Where can I get help?", "Use the support hub for account, eligibility and existing-claim guidance. Contact routes will be published only when they are monitored and ready."],
  ]},
] as const;

export { legalCopy };
