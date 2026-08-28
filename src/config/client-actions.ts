import { z } from "zod";

export const clientActionTypes = ["CONFIRM_INFORMATION", "REVIEW_INFORMATION", "CONTACT_CLAIMS_BRIDGE", "COMPLETE_ACCOUNT_INFORMATION", "GENERAL_ACTION"] as const;
export type ClientActionType = (typeof clientActionTypes)[number];

export const clientActionStatuses = ["OPEN", "COMPLETED", "CANCELLED"] as const;
export type ClientActionStatus = (typeof clientActionStatuses)[number];

export const clientActionPriorities = ["NORMAL", "IMPORTANT"] as const;
export type ClientActionPriority = (typeof clientActionPriorities)[number];

export const clientActionConfig: Readonly<Record<ClientActionType, { label: string; description: string; clientCanComplete: boolean }>> = {
  CONFIRM_INFORMATION: { label: "Confirm information", description: "Confirm that the information recorded for your claim is accurate.", clientCanComplete: true },
  REVIEW_INFORMATION: { label: "Review information", description: "Review the information requested by Claims Bridge.", clientCanComplete: true },
  CONTACT_CLAIMS_BRIDGE: { label: "Contact Claims Bridge", description: "Please contact Claims Bridge about this claim.", clientCanComplete: false },
  COMPLETE_ACCOUNT_INFORMATION: { label: "Complete account information", description: "Complete the account information needed for your claim.", clientCanComplete: true },
  GENERAL_ACTION: { label: "Action required", description: "There is an action connected to this claim.", clientCanComplete: false },
};

export const clientActionTypeLabels: Readonly<Record<ClientActionType, string>> = Object.fromEntries(clientActionTypes.map((type) => [type, clientActionConfig[type].label])) as Record<ClientActionType, string>;
export const clientActionStatusLabels: Readonly<Record<ClientActionStatus, string>> = { OPEN: "Open", COMPLETED: "Completed", CANCELLED: "Cancelled" };
export const clientActionPriorityLabels: Readonly<Record<ClientActionPriority, string>> = { NORMAL: "Normal", IMPORTANT: "Important" };
export const clientActionTitleSchema = z.string().trim().min(1).max(160);
export const clientActionDescriptionSchema = z.string().trim().min(1).max(5000);

export function isClientActionType(value: string): value is ClientActionType { return clientActionTypes.includes(value as ClientActionType); }
export function isClientActionStatus(value: string): value is ClientActionStatus { return clientActionStatuses.includes(value as ClientActionStatus); }
export function isClientActionPriority(value: string): value is ClientActionPriority { return clientActionPriorities.includes(value as ClientActionPriority); }
