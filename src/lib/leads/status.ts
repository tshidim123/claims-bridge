import type { LeadStatus } from "./types";
const transitions: Record<LeadStatus, readonly LeadStatus[]> = { NEW: ["CONTACTED", "FOLLOW_UP", "CLOSED"], CONTACTED: ["FOLLOW_UP", "CLOSED"], FOLLOW_UP: ["CONTACTED", "CLOSED"], CONVERTED: [], CLOSED: ["FOLLOW_UP"] };
export function canChangeLeadStatus(from: LeadStatus, to: LeadStatus) { return from !== "CONVERTED" && transitions[from].includes(to); }
export function isSystemDerivedLeadStatus(status: LeadStatus) { return status === "CONVERTED"; }
