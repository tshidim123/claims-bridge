export const leadStatuses = ["NEW", "CONTACTED", "FOLLOW_UP", "CONVERTED", "CLOSED"] as const;
export type LeadStatus = (typeof leadStatuses)[number];
export const leadContactMethods = ["email", "phone"] as const;
export type LeadContactMethod = (typeof leadContactMethods)[number];
