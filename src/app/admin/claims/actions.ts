"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isOperationalPriority, internalNoteMaxLength } from "@/config/admin-claims";
import { CLAIM_REFERENCE_PATTERN } from "@/lib/claims/reference";
import { addInternalClaimNote, archiveClaim, assignClaim, assignClaimToSelf, restoreArchivedClaim, setClaimPriority, unassignClaim, AdminClaimServiceError } from "@/lib/admin/claims/service";
import { requestEvidenceForStaff, reviewDocumentForStaff, reviewEvidenceForStaff, StaffWorkflowError, transitionClaimStatusForStaff } from "@/lib/admin/claims/workflow-service";
import { cancelClientActionForStaff, completeClientActionForStaff, createClientActionRequirement, StaffActionError } from "@/lib/admin/claims/action-service";
import { sendStaffClaimMessage, setStaffConversationStatus, StaffMessagingError, loadEarlierStaffMessages } from "@/lib/admin/claims/messaging-service";

const claimReferenceSchema = z.string().regex(CLAIM_REFERENCE_PATTERN);
const staffReferenceSchema = z.string().regex(/^CB-STF-[0-9A-F]{8}$/);
const noteSchema = z.string().trim().min(1).max(internalNoteMaxLength);

export type AdminClaimActionState = { ok: boolean; message?: string };

function serviceMessage(error: unknown) {
  if (error instanceof AdminClaimServiceError) {
    if (error.code === "CLAIM_NOT_FOUND") return "That claim could not be found.";
    if (error.code === "STAFF_NOT_ASSIGNABLE") return "That staff member is not currently available for assignment.";
    if (error.code === "INVALID_PRIORITY") return "Choose a valid operational priority.";
    if (error.code === "INVALID_NOTE") return "Enter a note between 1 and 10,000 characters.";
    if (error.code === "INVALID_ARCHIVE_REASON") return "Provide an archive reason between 3 and 500 characters.";
    if (error.code === "ARCHIVED") return "This claim is already archived and cannot be progressed.";
    if (error.code === "NOT_ARCHIVED") return "This claim is not currently archived.";
    if (error.code === "DUPLICATE") return "This assignment changed at the same time elsewhere. Refresh and try again.";
  }
  if (error instanceof StaffWorkflowError) {
    if (error.code === "CLAIM_NOT_FOUND" || error.code === "REQUIREMENT_NOT_FOUND" || error.code === "DOCUMENT_NOT_FOUND") return "The requested workflow record could not be found.";
    if (error.code === "CONFIRMATION_REQUIRED") return "Confirm this high-impact workflow action before continuing.";
    if (error.code === "INVALID_TRANSITION" || error.code === "INVALID_STATUS") return "That workflow transition is no longer available. Refresh and review the current state.";
    if (error.code === "CONCURRENT_CHANGE") return "This record changed while you were working. Refresh and review the current state.";
    if (error.code === "TERMINAL_CLAIM") return "This claim has reached a terminal workflow state.";
    if (error.code === "ARCHIVED") return "This claim is archived and cannot be progressed until it is restored.";
    if (error.code === "DOCUMENT_NOT_REVIEWABLE" || error.code === "TECHNICAL_STATE_REQUIRED") return "This review action is unavailable until secure document access and validation are available.";
    if (error.code === "INVALID_EVIDENCE_TYPE" || error.code === "INVALID_EVIDENCE_PRIORITY" || error.code === "INVALID_DUE_DATE") return "Check the evidence request details and try again.";
  }
  if (error instanceof StaffActionError) {
    if (error.code === "CLAIM_NOT_FOUND" || error.code === "ACTION_NOT_FOUND") return "The requested action could not be found.";
    if (error.code === "INVALID_TYPE" || error.code === "INVALID_PRIORITY" || error.code === "INVALID_DUE_DATE") return "Check the action details and try again.";
    if (error.code === "INVALID_TITLE") return "Enter a short action title.";
    if (error.code === "INVALID_DESCRIPTION") return "Enter a plain-text action description of 5,000 characters or fewer.";
    if (error.code === "TERMINAL_CLAIM") return "Client actions cannot be created on a terminal claim.";
    if (error.code === "ARCHIVED") return "This claim is archived and cannot be changed until it is restored.";
    if (error.code === "INVALID_STATUS") return "That action has already changed. Refresh and review the current state.";
    if (error.code === "CONCURRENT_CHANGE") return "This action changed while you were working. Refresh and review the current state.";
  }
  if (error instanceof StaffMessagingError) {
    if (error.code === "ARCHIVED") return "This claim is archived and its correspondence is read-only until it is restored.";
    if (error.code === "CONFIRMATION_REQUIRED") return "Confirm closing this conversation before continuing.";
    if (error.code === "CONVERSATION_CLOSED") return "This conversation is closed.";
    if (error.code === "CONVERSATION_NOT_FOUND") return "This claim does not have an available conversation.";
    if (error.code === "INVALID_MESSAGE") return "Write a plain-text message of 5,000 characters or fewer.";
    if (error.code === "CONCURRENT_CHANGE") return "This conversation changed while you were working. Refresh and review the current state.";
  }
  return "We could not complete that operational update. Please try again.";
}

async function currentUser() {
  const { userId } = await auth();
  return userId;
}

export async function setClaimPriorityAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const priority = formData.get("priority");
  if (!userId || !claimReference.success || typeof priority !== "string" || !isOperationalPriority(priority)) return { ok: false, message: "Please choose a valid claim priority." };
  try { await setClaimPriority(userId, claimReference.data, priority); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath("/admin/claims"); return { ok: true, message: "Operational priority updated." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function assignClaimAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const mode = formData.get("mode");
  const staffReference = staffReferenceSchema.safeParse(formData.get("staffReference"));
  if (!userId || !claimReference.success) return { ok: false, message: "This claim could not be identified." };
  try { if (mode === "self") await assignClaimToSelf(userId, claimReference.data); else if (staffReference.success) await assignClaim(userId, claimReference.data, staffReference.data); else return { ok: false, message: "Choose an available staff member." }; revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath("/admin/claims"); return { ok: true, message: "Claim assignment updated." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function unassignClaimAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  if (!userId || !claimReference.success) return { ok: false, message: "This claim could not be identified." };
  try { await unassignClaim(userId, claimReference.data); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath("/admin/claims"); return { ok: true, message: "Claim is now unassigned." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function addInternalNoteAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const body = noteSchema.safeParse(formData.get("body"));
  if (!userId || !claimReference.success || !body.success) return { ok: false, message: "Enter an internal note between 1 and 10,000 characters." };
  try { await addInternalClaimNote(userId, claimReference.data, body.data); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); return { ok: true, message: "Internal note added." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function transitionClaimStatusAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const requestedStatus = formData.get("requestedStatus");
  const confirmed = formData.get("confirmed") === "true";
  if (!userId || !claimReference.success || typeof requestedStatus !== "string") return { ok: false, message: "Choose an available workflow transition." };
  try { await transitionClaimStatusForStaff(userId, claimReference.data, requestedStatus, confirmed); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath("/admin/claims"); return { ok: true, message: "Claim status updated." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function requestEvidenceAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const evidenceType = formData.get("evidenceType");
  const priority = formData.get("priority");
  const dueDate = formData.get("dueDate");
  if (!userId || !claimReference.success || typeof evidenceType !== "string") return { ok: false, message: "Choose a valid evidence type." };
  try { await requestEvidenceForStaff(userId, claimReference.data, evidenceType, { required: formData.get("required") === "true", priority: typeof priority === "string" ? priority : undefined, dueDate: typeof dueDate === "string" ? dueDate : undefined }); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}/evidence`); revalidatePath("/admin/claims"); return { ok: true, message: "Evidence request updated." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

const requirementReferenceSchema = z.string().regex(/^CB-EVR-[0-9A-F]{8}$/);
const documentReferenceSchema = z.string().uuid();

const actionReferenceSchema = z.string().regex(/^CB-ACT-[0-9A-F]{8}$/);
const actionTitleSchema = z.string().trim().min(1).max(160);
const actionDescriptionSchema = z.string().trim().min(1).max(5000);

export async function reviewEvidenceAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const requirementReference = requirementReferenceSchema.safeParse(formData.get("requirementReference"));
  const requestedStatus = formData.get("requestedStatus");
  if (!userId || !claimReference.success || !requirementReference.success || typeof requestedStatus !== "string") return { ok: false, message: "Choose a valid evidence workflow action." };
  try { await reviewEvidenceForStaff(userId, claimReference.data, requirementReference.data, requestedStatus); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}/evidence`); revalidatePath("/admin/claims"); return { ok: true, message: "Evidence status updated." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function reviewDocumentAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const documentReference = documentReferenceSchema.safeParse(formData.get("documentReference"));
  const requestedStatus = formData.get("requestedStatus");
  const confirmed = formData.get("confirmed") === "true";
  if (!userId || !claimReference.success || !documentReference.success || typeof requestedStatus !== "string") return { ok: false, message: "Choose a valid document workflow action." };
  try { await reviewDocumentForStaff(userId, claimReference.data, documentReference.data, requestedStatus, confirmed); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}/documents`); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}/evidence`); revalidatePath("/admin/claims"); return { ok: true, message: "Document review status updated." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function sendStaffMessageAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const body = formData.get("body");
  const requestId = formData.get("requestId");
  if (!userId || !claimReference.success || typeof body !== "string" || (typeof requestId !== "string" && requestId !== null)) return { ok: false, message: "Write a message before sending." };
  try { await sendStaffClaimMessage(userId, claimReference.data, body, typeof requestId === "string" ? requestId : undefined); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}/messages`); revalidatePath("/admin/claims"); return { ok: true, message: "Message sent to the client." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function setStaffConversationStatusAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const status = formData.get("status");
  if (!userId || !claimReference.success || (status !== "OPEN" && status !== "CLOSED")) return { ok: false, message: "Choose a valid conversation action." };
  try { await setStaffConversationStatus(userId, claimReference.data, status, formData.get("confirmed") === "true"); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}/messages`); revalidatePath("/admin/claims"); return { ok: true, message: status === "CLOSED" ? "Conversation closed." : "Conversation reopened." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function loadEarlierStaffMessagesAction(claimReference: string, before: string) {
  const userId = await currentUser();
  if (!userId) return null;
  try { return await loadEarlierStaffMessages(userId, claimReference, before); } catch { return null; }
}

export async function createClientActionAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const type = formData.get("type");
  const title = actionTitleSchema.safeParse(formData.get("title"));
  const description = actionDescriptionSchema.safeParse(formData.get("description"));
  const priority = formData.get("priority");
  const dueDate = formData.get("dueDate");
  const requestId = formData.get("requestId");
  if (!userId || !claimReference.success || typeof type !== "string" || !title.success || !description.success || (typeof requestId !== "string" && requestId !== null)) return { ok: false, message: "Enter a valid client action." };
  try { await createClientActionRequirement(userId, claimReference.data, { type, title: title.data, description: description.data, priority: typeof priority === "string" ? priority : undefined, dueDate: typeof dueDate === "string" ? dueDate : undefined, requestId: typeof requestId === "string" ? requestId : undefined }); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath("/admin/claims"); return { ok: true, message: "Client action created." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

async function updateClientActionAction(formData: FormData, mode: "complete" | "cancel") {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const actionReference = actionReferenceSchema.safeParse(formData.get("actionReference"));
  if (!userId || !claimReference.success || !actionReference.success) return { ok: false, message: "This action could not be identified." };
  try { if (mode === "complete") await completeClientActionForStaff(userId, claimReference.data, actionReference.data); else await cancelClientActionForStaff(userId, claimReference.data, actionReference.data); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); return { ok: true, message: mode === "complete" ? "Client action completed." : "Client action cancelled." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function completeClientActionAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> { return updateClientActionAction(formData, "complete"); }
export async function cancelClientActionAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> { return updateClientActionAction(formData, "cancel"); }

const archiveReasonSchema = z.string().trim().min(3).max(500);

export async function archiveClaimAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  const reason = archiveReasonSchema.safeParse(formData.get("reason"));
  if (!userId || !claimReference.success || !reason.success || formData.get("confirmed") !== "true") return { ok: false, message: "Confirm and provide an archive reason before continuing." };
  try { await archiveClaim(userId, claimReference.data, reason.data); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath("/admin/claims"); revalidatePath("/admin"); return { ok: true, message: "Claim archived. Its workflow controls are now disabled." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}

export async function restoreClaimAction(_previous: AdminClaimActionState, formData: FormData): Promise<AdminClaimActionState> {
  const userId = await currentUser();
  const claimReference = claimReferenceSchema.safeParse(formData.get("claimReference"));
  if (!userId || !claimReference.success || formData.get("confirmed") !== "true") return { ok: false, message: "Confirm restoration before continuing." };
  try { await restoreArchivedClaim(userId, claimReference.data); revalidatePath(`/admin/claims/${encodeURIComponent(claimReference.data)}`); revalidatePath("/admin/claims"); revalidatePath("/admin"); return { ok: true, message: "Claim restored to the operational queues." }; } catch (error) { return { ok: false, message: serviceMessage(error) }; }
}
