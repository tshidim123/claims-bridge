export const communicationEvents = {
  ASSESSMENT_RECEIVED: { template: "ASSESSMENT_RECEIVED", preference: "ACCOUNT", destination: "/account/assessment", urgency: "important" },
  WELCOME: { template: "WELCOME", preference: "ACCOUNT", destination: "/account", urgency: "normal" },
  CLAIM_CREATED: { template: "CLAIM_CREATED", preference: "CLAIM", destination: "/account/claims", urgency: "important" },
  EVIDENCE_REQUESTED: { template: "EVIDENCE_REQUESTED", preference: "EVIDENCE", destination: "/account/claims", urgency: "action" },
  NEW_SECURE_MESSAGE: { template: "NEW_SECURE_MESSAGE", preference: "MESSAGES", destination: "/account", urgency: "important" },
  CLIENT_ACTION_REQUIRED: { template: "CLIENT_ACTION_REQUIRED", preference: "ACTION_REQUIRED", destination: "/account", urgency: "action" },
  NEW_PRE_ACCOUNT_ASSESSMENT: { template: "STAFF_ASSESSMENT", preference: "ASSESSMENTS", destination: "/admin/assessments", urgency: "important" },
} as const;

export type CommunicationEventKey = keyof typeof communicationEvents;
