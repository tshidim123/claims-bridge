export const notificationTypes = [
  "CLAIM_STATUS_UPDATED",
  "CLIENT_ACTION_REQUIRED",
  "EVIDENCE_REQUESTED",
  "EVIDENCE_MORE_INFORMATION_REQUIRED",
  "DOCUMENT_RECEIVED",
  "DOCUMENT_REVIEW_UPDATE",
  "NEW_MESSAGE",
  "CLAIM_PROGRESS_UPDATE",
  "CLAIM_COMPLETED",
  "ACCOUNT_NOTICE",
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationCategory =
  | "CLAIM"
  | "ACTION_REQUIRED"
  | "EVIDENCE"
  | "DOCUMENTS"
  | "MESSAGES"
  | "ACCOUNT";
export type NotificationPriority =
  "INFORMATION" | "IMPORTANT" | "ACTION_REQUIRED";
export type NotificationActionType =
  | "VIEW_CLAIM"
  | "VIEW_TIMELINE"
  | "VIEW_EVIDENCE"
  | "VIEW_DOCUMENTS"
  | "VIEW_MESSAGES"
  | "VIEW_ASSESSMENT"
  | "ACCOUNT";
export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

export type NotificationContext = {
  claimReference?: string;
  statusLabel?: string;
  evidenceTitle?: string;
};

type NotificationDefinition = {
  id: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  essential: boolean;
  title: string;
  body: (context: NotificationContext) => string;
  actionType?: NotificationActionType;
};

export const notificationDefinitions: Readonly<
  Record<NotificationType, NotificationDefinition>
> = {
  CLAIM_STATUS_UPDATED: {
    id: "CLAIM_STATUS_UPDATED",
    category: "CLAIM",
    priority: "IMPORTANT",
    essential: true,
    title: "Your claim status has changed",
    body: ({ statusLabel }) =>
      statusLabel
        ? `Your Claims Bridge claim is now marked as ${statusLabel}.`
        : "There is an update to your Claims Bridge claim status.",
    actionType: "VIEW_CLAIM",
  },
  CLIENT_ACTION_REQUIRED: {
    id: "CLIENT_ACTION_REQUIRED",
    category: "ACTION_REQUIRED",
    priority: "ACTION_REQUIRED",
    essential: true,
    title: "Action may be required",
    body: () =>
      "Your claim may need information or action from you before the workflow can continue.",
    actionType: "VIEW_CLAIM",
  },
  EVIDENCE_REQUESTED: {
    id: "EVIDENCE_REQUESTED",
    category: "EVIDENCE",
    priority: "ACTION_REQUIRED",
    essential: true,
    title: "Evidence has been requested",
    body: ({ evidenceTitle }) =>
      evidenceTitle
        ? `${evidenceTitle} has been requested for your claim.`
        : "Supporting evidence has been requested for your claim.",
    actionType: "VIEW_EVIDENCE",
  },
  EVIDENCE_MORE_INFORMATION_REQUIRED: {
    id: "EVIDENCE_MORE_INFORMATION_REQUIRED",
    category: "EVIDENCE",
    priority: "ACTION_REQUIRED",
    essential: true,
    title: "More evidence may be required",
    body: ({ evidenceTitle }) =>
      evidenceTitle
        ? `More information may be required for ${evidenceTitle}.`
        : "More information may be required before evidence review can continue.",
    actionType: "VIEW_EVIDENCE",
  },
  DOCUMENT_RECEIVED: {
    id: "DOCUMENT_RECEIVED",
    category: "DOCUMENTS",
    priority: "INFORMATION",
    essential: false,
    title: "Document received",
    body: () =>
      "A document has been received and is being processed for your claim.",
    actionType: "VIEW_DOCUMENTS",
  },
  DOCUMENT_REVIEW_UPDATE: {
    id: "DOCUMENT_REVIEW_UPDATE",
    category: "DOCUMENTS",
    priority: "INFORMATION",
    essential: false,
    title: "Document review updated",
    body: () =>
      "There is an update to the review state of a document connected to your claim.",
    actionType: "VIEW_DOCUMENTS",
  },
  NEW_MESSAGE: {
    id: "NEW_MESSAGE",
    category: "MESSAGES",
    priority: "IMPORTANT",
    essential: true,
    title: "New Claims Bridge message",
    body: () =>
      "Claims Bridge has sent a new message in your claim correspondence.",
    actionType: "VIEW_MESSAGES",
  },
  CLAIM_PROGRESS_UPDATE: {
    id: "CLAIM_PROGRESS_UPDATE",
    category: "CLAIM",
    priority: "INFORMATION",
    essential: true,
    title: "Your claim has progressed",
    body: ({ statusLabel }) =>
      statusLabel
        ? `Your claim has progressed to ${statusLabel}.`
        : "There is a new progress update for your claim.",
    actionType: "VIEW_TIMELINE",
  },
  CLAIM_COMPLETED: {
    id: "CLAIM_COMPLETED",
    category: "CLAIM",
    priority: "IMPORTANT",
    essential: true,
    title: "Your claim workflow is complete",
    body: () =>
      "The Claims Bridge workflow for your claim has reached a completed state.",
    actionType: "VIEW_CLAIM",
  },
  ACCOUNT_NOTICE: {
    id: "ACCOUNT_NOTICE",
    category: "ACCOUNT",
    priority: "IMPORTANT",
    essential: true,
    title: "Account notice",
    body: () =>
      "There is an important notice about your Claims Bridge account.",
    actionType: "ACCOUNT",
  },
};

export const notificationCategoryLabels: Readonly<
  Record<NotificationCategory, string>
> = {
  CLAIM: "Claim updates",
  ACTION_REQUIRED: "Action required",
  EVIDENCE: "Evidence",
  DOCUMENTS: "Documents",
  MESSAGES: "Messages",
  ACCOUNT: "Account",
};

export const notificationPriorityLabels: Readonly<
  Record<NotificationPriority, string>
> = {
  INFORMATION: "Information",
  IMPORTANT: "Important",
  ACTION_REQUIRED: "Action required",
};

export const notificationPreferenceConfig: Readonly<
  Record<
    NotificationCategory,
    { essential: boolean; defaultEnabled: boolean; description: string }
  >
> = {
  CLAIM: {
    essential: true,
    defaultEnabled: true,
    description: "Important changes to the workflow of your claim.",
  },
  ACTION_REQUIRED: {
    essential: true,
    defaultEnabled: true,
    description: "Requests for information or action from you.",
  },
  EVIDENCE: {
    essential: true,
    defaultEnabled: true,
    description: "Evidence requests and changes that may need your attention.",
  },
  DOCUMENTS: {
    essential: false,
    defaultEnabled: true,
    description:
      "Informational updates about documents connected to your claim.",
  },
  MESSAGES: {
    essential: true,
    defaultEnabled: true,
    description: "New secure correspondence from Claims Bridge.",
  },
  ACCOUNT: {
    essential: true,
    defaultEnabled: true,
    description: "Important account and security notices.",
  },
};

export const claimStatusNotificationTypes: Readonly<
  Record<string, NotificationType | null>
> = {
  INFORMATION_REQUIRED: "CLIENT_ACTION_REQUIRED",
  AWAITING_CLIENT: "CLIENT_ACTION_REQUIRED",
  INITIAL_REVIEW: "CLAIM_PROGRESS_UPDATE",
  COMPLETED: "CLAIM_COMPLETED",
};

export function isNotificationType(value: string): value is NotificationType {
  return notificationTypes.includes(value as NotificationType);
}

export function canDisableNotificationCategory(category: NotificationCategory) {
  return !notificationPreferenceConfig[category].essential;
}

export function resolveNotificationAction(
  actionType: NotificationActionType | null | undefined,
  actionReference: string | null | undefined,
) {
  if (!actionType) return null;
  if (actionType === "ACCOUNT")
    return actionReference && /^CB-ASM-[0-9A-F]{8}$/.test(actionReference)
      ? `/account/assessments/${encodeURIComponent(actionReference)}`
      : "/account/profile";
  if (actionType === "VIEW_ASSESSMENT") return "/account/assessment";
  if (!actionReference || !/^[A-Za-z0-9-]{4,64}$/.test(actionReference))
    return null;
  const claim = encodeURIComponent(actionReference);
  const routes: Record<
    Exclude<NotificationActionType, "ACCOUNT" | "VIEW_ASSESSMENT">,
    string
  > = {
    VIEW_CLAIM: `/account/claims/${claim}`,
    VIEW_TIMELINE: `/account/claims/${claim}/timeline`,
    VIEW_EVIDENCE: `/account/claims/${claim}/evidence`,
    VIEW_DOCUMENTS: `/account/claims/${claim}/documents`,
    VIEW_MESSAGES: `/account/claims/${claim}/messages`,
  };
  return (
    routes[
      actionType as Exclude<
        NotificationActionType,
        "ACCOUNT" | "VIEW_ASSESSMENT"
      >
    ] ?? null
  );
}
