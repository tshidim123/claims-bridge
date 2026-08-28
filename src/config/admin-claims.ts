import { claimStageConfig, claimStatuses, type ClaimStage, type ClaimStatus } from "@/config/claim-statuses";
import { getClaimWaitingOn, claimWaitingOnLabels, type ClaimWaitingOn } from "@/config/claim-tracking";

export const operationalPriorities = ["NORMAL", "ELEVATED", "HIGH"] as const;
export type OperationalPriority = (typeof operationalPriorities)[number];
export const operationalPriorityLabels: Record<OperationalPriority, string> = { NORMAL: "Normal", ELEVATED: "Elevated", HIGH: "High" };

export const claimQueueSorts = ["NEWEST", "OLDEST", "RECENTLY_ACTIVE", "PRIORITY"] as const;
export type ClaimQueueSort = (typeof claimQueueSorts)[number];

export const claimAssignmentFilters = ["ALL", "MINE", "UNASSIGNED", "ASSIGNED"] as const;
export type ClaimAssignmentFilter = (typeof claimAssignmentFilters)[number];
export const claimWaitingOnValues: ClaimWaitingOn[] = ["CLIENT", "CLAIMS_BRIDGE", "THIRD_PARTY", "NONE"];
export const claimWaitingOnFilterLabels = claimWaitingOnLabels;

export const internalNoteMaxLength = 10_000;
export const queuePageSize = 25;

export function isOperationalPriority(value: string): value is OperationalPriority {
  return (operationalPriorities as readonly string[]).includes(value);
}

export function isClaimQueueSort(value: string): value is ClaimQueueSort {
  return (claimQueueSorts as readonly string[]).includes(value);
}

export function isClaimAssignmentFilter(value: string): value is ClaimAssignmentFilter {
  return (claimAssignmentFilters as readonly string[]).includes(value);
}

export function getClaimStageLabel(stage: ClaimStage) {
  return claimStageConfig.find((item) => item.id === stage)?.label ?? stage;
}

export function getClaimQueueWaitingOn(status: ClaimStatus) {
  return getClaimWaitingOn(status);
}

export function getClaimQueueStatusValues() {
  return claimStatuses;
}
