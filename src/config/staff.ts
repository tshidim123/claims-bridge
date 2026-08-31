export const staffRoles = ["SUPER_ADMIN", "ADMIN", "CASE_MANAGER", "EVIDENCE_REVIEWER", "SUPPORT", "READ_ONLY"] as const;
export type StaffRole = (typeof staffRoles)[number];

export const staffStatuses = ["ACTIVE", "SUSPENDED"] as const;
export type StaffStatus = (typeof staffStatuses)[number];

export const staffPermissions = [
  "ADMIN_ACCESS", "CLAIMS_VIEW", "CLAIMS_MANAGE", "CLAIMS_TRANSITION_STATUS", "CLAIMS_ARCHIVE", "CLIENTS_VIEW", "CLIENTS_MANAGE",
  "LEADS_VIEW", "LEADS_MANAGE",
  "EVIDENCE_VIEW", "EVIDENCE_REQUEST", "EVIDENCE_REVIEW", "DOCUMENTS_VIEW", "DOCUMENTS_REVIEW", "MESSAGES_VIEW",
  "MESSAGES_REPLY", "MESSAGES_MANAGE_CONVERSATION", "NOTIFICATIONS_VIEW", "NOTIFICATIONS_CREATE", "STAFF_VIEW",
  "STAFF_MANAGE", "AUDIT_VIEW", "SETTINGS_VIEW", "SETTINGS_MANAGE",
] as const;
export type StaffPermission = (typeof staffPermissions)[number];

export const staffRoleLabels: Record<StaffRole, string> = {
  SUPER_ADMIN: "Super admin",
  ADMIN: "Admin",
  CASE_MANAGER: "Case manager",
  EVIDENCE_REVIEWER: "Evidence reviewer",
  SUPPORT: "Support",
  READ_ONLY: "Read only",
};

export const staffStatusLabels: Record<StaffStatus, string> = { ACTIVE: "Active", SUSPENDED: "Suspended" };

export const rolePermissions: Readonly<Record<StaffRole, readonly StaffPermission[]>> = {
  SUPER_ADMIN: staffPermissions,
  ADMIN: staffPermissions.filter((permission) => permission !== "SETTINGS_MANAGE"),
  CASE_MANAGER: ["ADMIN_ACCESS", "CLAIMS_VIEW", "CLAIMS_MANAGE", "CLAIMS_TRANSITION_STATUS", "CLIENTS_VIEW", "CLIENTS_MANAGE", "LEADS_VIEW", "LEADS_MANAGE", "EVIDENCE_VIEW", "EVIDENCE_REQUEST", "EVIDENCE_REVIEW", "DOCUMENTS_VIEW", "DOCUMENTS_REVIEW", "MESSAGES_VIEW", "MESSAGES_REPLY", "MESSAGES_MANAGE_CONVERSATION", "NOTIFICATIONS_VIEW", "NOTIFICATIONS_CREATE"],
  EVIDENCE_REVIEWER: ["ADMIN_ACCESS", "CLAIMS_VIEW", "EVIDENCE_VIEW", "EVIDENCE_REQUEST", "EVIDENCE_REVIEW", "DOCUMENTS_VIEW", "DOCUMENTS_REVIEW"],
  SUPPORT: ["ADMIN_ACCESS", "CLAIMS_VIEW", "CLIENTS_VIEW", "LEADS_VIEW", "MESSAGES_VIEW", "MESSAGES_REPLY", "NOTIFICATIONS_VIEW"],
  READ_ONLY: ["ADMIN_ACCESS", "CLAIMS_VIEW", "CLIENTS_VIEW", "LEADS_VIEW", "EVIDENCE_VIEW", "DOCUMENTS_VIEW", "MESSAGES_VIEW", "NOTIFICATIONS_VIEW", "STAFF_VIEW", "AUDIT_VIEW"],
};

export function isStaffRole(value: string): value is StaffRole {
  return (staffRoles as readonly string[]).includes(value);
}

export function isStaffStatus(value: string): value is StaffStatus {
  return (staffStatuses as readonly string[]).includes(value);
}

export function hasPermissionForRole(role: StaffRole, permission: StaffPermission): boolean {
  return rolePermissions[role].includes(permission);
}

export const staffAuditActions = ["STAFF_BOOTSTRAPPED", "STAFF_CREATED", "STAFF_ROLE_CHANGED", "STAFF_SUSPENDED", "STAFF_REACTIVATED", "CLAIM_PRIORITY_CHANGED", "CLAIM_ASSIGNED", "CLAIM_REASSIGNED", "CLAIM_UNASSIGNED", "CLAIM_INTERNAL_NOTE_ADDED", "CLAIM_STATUS_CHANGED", "CLAIM_ARCHIVED", "CLAIM_RESTORED", "EVIDENCE_REQUESTED", "EVIDENCE_STATUS_CHANGED", "DOCUMENT_STATUS_CHANGED", "CLAIM_MESSAGE_SENT", "CLAIM_CONVERSATION_CLOSED", "CLAIM_CONVERSATION_REOPENED", "CLIENT_ACTION_CREATED", "CLIENT_ACTION_COMPLETED", "CLIENT_ACTION_CANCELLED", "CLIENT_PROFILE_UPDATED", "LEAD_STATUS_CHANGED", "LEAD_NOTE_ADDED", "LEAD_CONVERTED"] as const;
export type StaffAuditAction = (typeof staffAuditActions)[number];

export const staffAuditActorTypes = ["STAFF", "SYSTEM"] as const;
export type StaffAuditActorType = (typeof staffAuditActorTypes)[number];
