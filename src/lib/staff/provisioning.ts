import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { isStaffRole, type StaffRole } from "@/config/staff";
import { createStaffUser, StaffServiceError } from "@/lib/staff/service";
import { requirePermission } from "@/lib/staff/authorization";

const emailSchema = z.string().trim().email().max(320);

export class StaffProvisioningError extends Error {
  constructor(public readonly code: "INVALID_EMAIL" | "NOT_VERIFIED" | "CLERK_UNAVAILABLE", message: string) {
    super(message);
    this.name = "StaffProvisioningError";
  }
}

export async function provisionStaffByEmail(input: { actorClerkUserId: string; email: string; displayName?: string | null; role: string }) {
  const actor = await requirePermission(input.actorClerkUserId, "STAFF_MANAGE");
  const parsedEmail = emailSchema.safeParse(input.email);
  if (!parsedEmail.success || !isStaffRole(input.role)) throw new StaffProvisioningError("INVALID_EMAIL", "Enter a valid existing Clerk account email and role.");
  const email = parsedEmail.data.toLowerCase();
  if (input.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new StaffServiceError("FORBIDDEN", "Only an active super admin can create another super admin.");

  let users;
  try {
    const client = await clerkClient();
    const response = await client.users.getUserList({ emailAddress: [email], limit: 10 });
    users = response.data.filter((user) => user.emailAddresses.some((address) => address.emailAddress.toLowerCase() === email && address.verification?.status === "verified"));
  } catch {
    throw new StaffProvisioningError("CLERK_UNAVAILABLE", "The existing account could not be verified right now. Try again later.");
  }
  if (users.length !== 1) throw new StaffProvisioningError("NOT_VERIFIED", "No existing account could be verified for that email address.");
  const user = users[0];
  const fallbackName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || null;
  return createStaffUser({ actorClerkUserId: input.actorClerkUserId, clerkUserId: user.id, displayName: input.displayName?.trim() || fallbackName, role: input.role as StaffRole });
}
