"use server";
import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { changeLeadStatus, addLeadNote } from "@/lib/leads/service";
import { leadNoteSchema, leadStatusChangeSchema } from "@/lib/leads/validation";
export async function updateLeadStatus(formData: FormData) { const { userId } = await auth(); if (!userId) return; const parsed = leadStatusChangeSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return; await changeLeadStatus(userId, parsed.data.leadReference, parsed.data.status); revalidatePath(`/admin/leads/${parsed.data.leadReference}`); revalidatePath("/admin/leads"); }
export async function createLeadNote(formData: FormData) { const { userId } = await auth(); if (!userId) return; const parsed = leadNoteSchema.safeParse(Object.fromEntries(formData)); if (!parsed.success) return; await addLeadNote(userId, parsed.data.leadReference, parsed.data.body); revalidatePath(`/admin/leads/${parsed.data.leadReference}`); }
