"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  markAllStaffNotificationsRead,
  markStaffNotificationRead,
  openStaffNotification,
  retryEmailForStaff,
  updateOwnStaffPreference,
} from "@/lib/communications/staff-operations";
async function user() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorised");
  return userId;
}
export async function markNotificationRead(formData: FormData) {
  await markStaffNotificationRead(
    await user(),
    String(formData.get("reference")),
  );
  revalidatePath("/admin/notifications");
}
export async function markAllNotificationsRead() {
  await markAllStaffNotificationsRead(await user());
  revalidatePath("/admin/notifications");
}
export async function openNotification(formData: FormData) {
  const destination = await openStaffNotification(
    await user(),
    String(formData.get("reference")),
  );
  revalidatePath("/admin/notifications");
  redirect(destination);
}
export async function saveStaffPreference(formData: FormData) {
  await updateOwnStaffPreference(
    await user(),
    String(formData.get("category")),
    formData.get("email") === "on",
    formData.get("inApp") === "on",
  );
  revalidatePath("/admin/preferences");
}
export async function retryCommunication(formData: FormData) {
  await retryEmailForStaff(
    await user(),
    String(formData.get("emailReference")),
  );
  revalidatePath("/admin/communications");
}
