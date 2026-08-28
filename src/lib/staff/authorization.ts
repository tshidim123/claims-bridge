import "server-only";

import { eq } from "drizzle-orm";

import { hasPermissionForRole, rolePermissions, type StaffPermission } from "@/config/staff";
import { getDb } from "@/lib/db";
import { staffUsers, type StaffUser } from "@/lib/db/schema/staff";

export type StaffContext = {
  staffReference: string;
  displayName: string | null;
  role: StaffUser["role"];
  status: "ACTIVE";
  permissions: readonly StaffPermission[];
};

export class StaffAuthorizationError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "NOT_STAFF" | "SUSPENDED" | "FORBIDDEN", message: string) {
    super(message);
    this.name = "StaffAuthorizationError";
  }
}

export async function getStaffRecordByClerkId(clerkUserId: string): Promise<StaffUser | undefined> {
  return (await getDb().select().from(staffUsers).where(eq(staffUsers.clerkUserId, clerkUserId)).limit(1))[0];
}

function toStaffContext(staff: StaffUser): StaffContext | null {
  if (staff.status !== "ACTIVE") return null;
  return { staffReference: staff.staffReference, displayName: staff.displayName, role: staff.role, status: "ACTIVE", permissions: rolePermissions[staff.role] };
}

export function createStaffContext(staff: StaffUser): StaffContext | null {
  return toStaffContext(staff);
}

export function hasStaffPermission(context: StaffContext, permission: StaffPermission): boolean {
  return hasPermissionForRole(context.role, permission);
}

export async function getStaffContext(clerkUserId: string): Promise<StaffContext | null> {
  const staff = await getStaffRecordByClerkId(clerkUserId);
  return staff ? createStaffContext(staff) : null;
}

export async function requireStaff(clerkUserId: string): Promise<StaffContext> {
  const staff = await getStaffRecordByClerkId(clerkUserId);
  if (!staff) throw new StaffAuthorizationError("NOT_STAFF", "This account is not authorised for the operations workspace.");
  if (staff.status !== "ACTIVE") throw new StaffAuthorizationError("SUSPENDED", "This staff account is not active.");
  return createStaffContext(staff)!;
}

export async function requirePermission(clerkUserId: string, permission: StaffPermission): Promise<StaffContext> {
  const context = await requireStaff(clerkUserId);
  if (!hasStaffPermission(context, permission)) throw new StaffAuthorizationError("FORBIDDEN", "You do not have permission to perform this operation.");
  return context;
}
