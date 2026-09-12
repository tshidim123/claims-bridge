type EventDefinition = {
  audience: "CLIENT" | "STAFF";
  template: string;
  version: "1";
  preference: string;
  destination: string;
  channels: readonly ("EMAIL" | "IN_APP")[];
  required: boolean;
  urgency: "normal" | "important" | "action";
  subject?: string;
  preheader?: string;
  dedupe?: string;
};
const client = (
  template: string,
  preference: string,
  destination: string,
  required: boolean,
  urgency: EventDefinition["urgency"],
  extra: Partial<EventDefinition> = {},
): EventDefinition => ({
  audience: "CLIENT",
  template,
  version: "1",
  preference,
  destination,
  channels: ["EMAIL"],
  required,
  urgency,
  ...extra,
});
const staff = (
  template: string,
  preference: string,
  destination: string,
  urgency: EventDefinition["urgency"],
  extra: Partial<EventDefinition> = {},
): EventDefinition => ({
  audience: "STAFF",
  template,
  version: "1",
  preference,
  destination,
  channels: ["EMAIL", "IN_APP"],
  required: false,
  urgency,
  ...extra,
});

export const communicationEvents = {
  START_CLAIM_REMINDER: client(
    "SERVICE_UPDATE",
    "ACCOUNT",
    "/account/assessments",
    true,
    "important",
  ),
  ASSESSMENT_FOLLOW_UP: client(
    "SERVICE_UPDATE",
    "ACCOUNT",
    "/account/assessments",
    true,
    "normal",
  ),
  GENERAL_SERVICE_UPDATE: client(
    "SERVICE_UPDATE",
    "ACCOUNT",
    "/account",
    true,
    "normal",
  ),
  NEW_CLIENT: staff("STAFF_CLIENT", "CLIENTS", "/admin/clients", "important", {
    subject: "New Claims Bridge client",
    preheader: "A new client has completed account setup.",
    dedupe: "STAFF_NEW_CLIENT:<client>:<staff>",
  }),
  ASSESSMENT_RECEIVED: client(
    "ASSESSMENT_RECEIVED",
    "ACCOUNT",
    "/account/assessment",
    true,
    "important",
  ),
  WELCOME: client("WELCOME", "ACCOUNT", "/account", true, "normal", {
    subject: "Welcome to Claims Bridge",
    preheader: "Your secure Claims Bridge account is ready.",
    dedupe: "WELCOME:<client-reference>",
  }),
  ASSESSMENT_ATTACHED_TO_ACCOUNT: client(
    "ASSESSMENT_ATTACHED_TO_ACCOUNT",
    "ACCOUNT",
    "/account/assessments",
    true,
    "normal",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "Your assessment is now linked to your Claims Bridge account",
      preheader:
        "Your saved eligibility assessment is available securely in your account.",
      dedupe: "ASSESSMENT_ATTACHED:<assessment-reference>",
    },
  ),
  CLAIM_CREATED: client(
    "CLAIM_CREATED",
    "CLAIM",
    "/account/claims",
    true,
    "important",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "Your Claims Bridge claim has been created",
      preheader:
        "Your claim is now available in your secure Claims Bridge account.",
      dedupe: "CLAIM_CREATED:<claim-reference>",
    },
  ),
  CLAIM_STATUS_UPDATED: client(
    "CLAIM_STATUS_UPDATED",
    "CLAIM",
    "/account/claims",
    false,
    "important",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "An update on your Claims Bridge claim",
      preheader: "There is an update in your secure Claims Bridge claim area.",
      dedupe: "CLAIM_STATUS:<history-reference>",
    },
  ),
  EVIDENCE_REQUESTED: client(
    "EVIDENCE_REQUESTED",
    "EVIDENCE",
    "/account/claims",
    true,
    "action",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "Evidence needed for your Claims Bridge claim",
      preheader: "Review the supporting information requested for your claim.",
      dedupe: "EVIDENCE_REQUESTED:<requirement-reference>",
    },
  ),
  DOCUMENT_RECEIVED: client(
    "DOCUMENT_RECEIVED",
    "DOCUMENTS",
    "/account/claims",
    false,
    "normal",
    {
      subject: "We received your document",
      preheader: "Your document has been securely received by Claims Bridge.",
      dedupe: "DOCUMENT_RECEIVED:<document-reference>",
    },
  ),
  DOCUMENT_ACTION_REQUIRED: client(
    "DOCUMENT_ACTION_REQUIRED",
    "DOCUMENTS",
    "/account/claims",
    true,
    "action",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "Action needed on a document for your Claims Bridge claim",
      preheader:
        "Please review a document request in your secure Claims Bridge account.",
      dedupe: "DOCUMENT_ACTION:<document-status-event>",
    },
  ),
  NEW_SECURE_MESSAGE: client(
    "NEW_SECURE_MESSAGE",
    "MESSAGES",
    "/account/messages",
    true,
    "important",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "New secure message from Claims Bridge",
      preheader:
        "A new message is waiting in your secure Claims Bridge account.",
      dedupe: "NEW_SECURE_MESSAGE:<message-identity>",
    },
  ),
  CLIENT_ACTION_REQUIRED: client(
    "CLIENT_ACTION_REQUIRED",
    "ACTION_REQUIRED",
    "/account/claims",
    true,
    "action",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "Action needed on your Claims Bridge claim",
      preheader: "Review the next step requested for your claim.",
      dedupe: "CLIENT_ACTION_REQUIRED:<action-reference>",
    },
  ),
  CLAIM_COMPLETED: client(
    "CLAIM_COMPLETED",
    "CLAIM",
    "/account/claims",
    true,
    "important",
    {
      channels: ["EMAIL", "IN_APP"],
      subject: "Your Claims Bridge claim workflow is complete",
      preheader: "Your Claims Bridge workflow has reached a completed state.",
      dedupe: "CLAIM_STATUS:<history-reference>",
    },
  ),
  NEW_PRE_ACCOUNT_ASSESSMENT: staff(
    "STAFF_ASSESSMENT",
    "ASSESSMENTS",
    "/admin/assessments",
    "important",
    {
      subject: "New Claims Bridge eligibility assessment",
      preheader: "A new signed-out eligibility assessment has been submitted.",
      dedupe: "STAFF_NEW_PRE_ACCOUNT_ASSESSMENT:<assessment>:<staff>",
    },
  ),
  NEW_AUTHENTICATED_ASSESSMENT: staff(
    "STAFF_ASSESSMENT",
    "ASSESSMENTS",
    "/admin/assessments",
    "important",
    {
      subject: "New authenticated eligibility assessment",
      preheader: "A signed-in client completed a new eligibility assessment.",
      dedupe: "STAFF_NEW_AUTHENTICATED_ASSESSMENT:<assessment>:<staff>",
    },
  ),
  NEW_CLAIM: staff("STAFF_CLAIM", "CLAIMS", "/admin/claims", "important", {
    subject: "New Claims Bridge claim",
    preheader: "A client has explicitly created a claim.",
    dedupe: "STAFF_NEW_CLAIM:<claim>:<staff>",
  }),
  CLIENT_MESSAGE_RECEIVED: staff(
    "STAFF_MESSAGE",
    "MESSAGES",
    "/admin/messages",
    "important",
    {
      subject: "New client secure message",
      preheader: "A client has sent a new secure message.",
      dedupe: "STAFF_CLIENT_MESSAGE:<message>:<staff>",
    },
  ),
  EVIDENCE_UPLOADED: staff(
    "STAFF_EVIDENCE",
    "EVIDENCE",
    "/admin/evidence",
    "normal",
    {
      subject: "New evidence uploaded",
      preheader: "A client document is ready for operational review.",
      dedupe: "STAFF_EVIDENCE_UPLOADED:<document>:<staff>",
    },
  ),
  CLIENT_ACTION_COMPLETED: staff(
    "STAFF_ACTION",
    "CLAIMS",
    "/admin/client-actions",
    "normal",
    {
      subject: "Client action completed",
      preheader: "A client has completed a requested action.",
      dedupe: "STAFF_CLIENT_ACTION_COMPLETED:<action>:<staff>",
    },
  ),
  CLAIM_ASSIGNED: staff(
    "STAFF_ASSIGNMENT",
    "ASSIGNMENTS",
    "/admin/claims",
    "important",
    {
      subject: "Claim assigned",
      preheader: "A claim is ready for your attention.",
      dedupe: "STAFF_CLAIM_ASSIGNED:<assignment>:<staff>",
    },
  ),
  HIGH_PRIORITY_CLAIM: staff(
    "STAFF_PRIORITY",
    "PRIORITY",
    "/admin/claims",
    "action",
    {
      subject: "High-priority Claims Bridge case",
      preheader: "A claim has moved into the high-priority queue.",
      dedupe: "STAFF_HIGH_PRIORITY:<claim>:<staff>",
    },
  ),
} as const;
export type CommunicationEventKey = keyof typeof communicationEvents;
