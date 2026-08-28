"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isStaffRole } from "@/config/staff";
import { provisionStaffByEmail, StaffProvisioningError } from "@/lib/staff/provisioning";
import { changeStaffRole, reactivateStaffUser, StaffServiceError, suspendStaffUser } from "@/lib/staff/service";

export type StaffActionState = { ok: boolean; message?: string };
const reference = z.string().regex(/^CB-STF-[0-9A-F]{8}$/);

function message(error: unknown) {
  if (error instanceof StaffProvisioningError) return error.message;
  if (error instanceof StaffServiceError) {
    if (error.code === "DUPLICATE") return "That existing Clerk identity is already registered as staff.";
    if (error.code === "FORBIDDEN") return "You do not have permission to manage that level of staff access.";
    if (error.code === "CONFIRMATION_REQUIRED") return "Confirm the proposed access change before continuing.";
    if (error.code === "LAST_SUPER_ADMIN") return "The last active super admin must remain available.";
    if (error.code === "NOT_FOUND") return "That staff record could not be found.";
    if (error.code === "INVALID_STATE") return "This staff access change is not available from the current state.";
  }
  return "We could not complete that staff access change. Please review the current state and try again.";
}

async function actor() { return (await auth()).userId; }
function refresh() { revalidatePath("/admin/team"); revalidatePath("/admin/access"); revalidatePath("/admin/audit"); }

export async function provisionStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const userId = await actor(); const email = formData.get("email"); const role = formData.get("role"); const displayName = formData.get("displayName");
  if (!userId || typeof email !== "string" || typeof role !== "string" || !isStaffRole(role) || (displayName !== null && typeof displayName !== "string")) return { ok: false, message: "Enter an existing verified Clerk account and a valid role." };
  try { const created = await provisionStaffByEmail({ actorClerkUserId: userId, email, role, displayName }); refresh(); return { ok: true, message: `Staff access created: ${created.staffReference}.` }; } catch (error) { return { ok: false, message: message(error) }; }
}

export async function changeStaffRoleAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const userId = await actor(); const targetReference = reference.safeParse(formData.get("staffReference")); const role = formData.get("role");
  if (!userId || !targetReference.success || typeof role !== "string" || !isStaffRole(role)) return { ok: false, message: "Choose a valid staff role." };
  try { await changeStaffRole({ actorClerkUserId: userId, targetReference: targetReference.data, role, confirmed: formData.get("confirmed") === "true" }); refresh(); return { ok: true, message: "Staff role updated." }; } catch (error) { return { ok: false, message: message(error) }; }
}

export async function suspendStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const userId = await actor(); const targetReference = reference.safeParse(formData.get("staffReference"));
  if (!userId || !targetReference.success) return { ok: false, message: "That staff record could not be identified." };
  try { await suspendStaffUser({ actorClerkUserId: userId, targetReference: targetReference.data, confirmed: formData.get("confirmed") === "true" }); refresh(); return { ok: true, message: "Staff access suspended." }; } catch (error) { return { ok: false, message: message(error) }; }
}

export async function reactivateStaffAction(_previous: StaffActionState, formData: FormData): Promise<StaffActionState> {
  const userId = await actor(); const targetReference = reference.safeParse(formData.get("staffReference"));
  if (!userId || !targetReference.success) return { ok: false, message: "That staff record could not be identified." };
  try { await reactivateStaffUser({ actorClerkUserId: userId, targetReference: targetReference.data }); refresh(); return { ok: true, message: "Staff access reactivated." }; } catch (error) { return { ok: false, message: message(error) }; }
}
