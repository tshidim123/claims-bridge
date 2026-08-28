import "server-only";

import { and, asc, count, desc, eq, gt, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { clientActionPriorities, clientActionStatuses, clientActionTypes, type ClientActionPriority, type ClientActionStatus, type ClientActionType } from "@/config/client-actions";
import { claimStageConfig, claimStatusConfig, claimStatuses, isTerminalClaimStatus, type ClaimStatus } from "@/config/claim-statuses";
import { getClaimStageLabel, operationalPriorityLabels, type OperationalPriority } from "@/config/admin-claims";
import { rolePermissions, type StaffRole } from "@/config/staff";
import { evidenceRequirementConfig, evidenceRequirementPriorities, evidenceRequirementStatuses, evidenceRequirementTypes, documentCategories, documentSecurityStatuses, documentStatuses, type EvidenceRequirementType } from "@/config/evidence";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { claims } from "@/lib/db/schema/claims";
import { claimActionRequirements } from "@/lib/db/schema/actions";
import { claimAssignments } from "@/lib/db/schema/operations";
import { claimConversations, claimMessageReads, claimMessages } from "@/lib/db/schema/messaging";
import { claimDocuments, claimEvidenceRequirements } from "@/lib/db/schema/evidence";
import { staffUsers } from "@/lib/db/schema/staff";
import { getDb } from "@/lib/db";
import { getStaffRecordByClerkId, requirePermission, requireStaff } from "@/lib/staff/authorization";
import { isDocumentReviewAvailable } from "@/lib/documents/service";

const PAGE_SIZE = 25;
const TERMINAL_STATUSES = claimStatuses.filter((status) => isTerminalClaimStatus(status));

type PageInput = { page?: string; search?: string };
export type QueuePage<T> = { items: readonly T[]; page: number; pageSize: number; total: number; hasPreviousPage: boolean; hasNextPage: boolean };

function pageNumber(value?: string) { const parsed = Number(value ?? "1"); return Number.isInteger(parsed) ? Math.min(1000, Math.max(1, parsed)) : 1; }
function searchValue(value?: string) { return value?.trim().slice(0, 100) || undefined; }
function like(value: string) { return `%${value.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`; }
function iso(date: Date | null | undefined) { return date?.toISOString() ?? null; }
function stageStatuses(stage?: string) { return stage && claimStageConfig.some((item) => item.id === stage) ? claimStatuses.filter((status) => claimStatusConfig[status].stage === stage) : undefined; }
function currentAssignment() { return and(eq(claimAssignments.claimId, claims.id), isNull(claimAssignments.unassignedAt)); }

async function staffId(clerkUserId: string) { return (await getStaffRecordByClerkId(clerkUserId))?.id; }

async function unreadCounts(conversationIds: string[], viewerId: string) {
  if (!conversationIds.length) return new Map<string, number>();
  const db = getDb();
  const rows = await db.select({ conversationId: claimMessages.conversationId, unread: count(claimMessages.id) }).from(claimMessages).leftJoin(claimMessageReads, and(eq(claimMessageReads.conversationId, claimMessages.conversationId), eq(claimMessageReads.viewerType, "CLAIMS_BRIDGE"), eq(claimMessageReads.viewerId, viewerId))).where(and(inArray(claimMessages.conversationId, conversationIds), eq(claimMessages.senderType, "CLIENT"), eq(claimMessages.clientVisible, true), or(isNull(claimMessageReads.lastReadAt), gt(claimMessages.createdAt, claimMessageReads.lastReadAt)))).groupBy(claimMessages.conversationId);
  return new Map(rows.map((row) => [row.conversationId, Number(row.unread)]));
}

async function latestClientMessages(conversationIds: string[]) {
  if (!conversationIds.length) return new Map<string, { body: string; createdAt: string }>();
  const rows = await getDb().select({ conversationId: claimMessages.conversationId, body: claimMessages.body, createdAt: claimMessages.createdAt }).from(claimMessages).where(and(inArray(claimMessages.conversationId, conversationIds), eq(claimMessages.senderType, "CLIENT"), eq(claimMessages.clientVisible, true))).orderBy(desc(claimMessages.createdAt), desc(claimMessages.id));
  const latest = new Map<string, { body: string; createdAt: string }>();
  for (const row of rows) if (!latest.has(row.conversationId)) latest.set(row.conversationId, { body: row.body.slice(0, 180), createdAt: row.createdAt.toISOString() });
  return latest;
}

export type AdminMessageQueueItem = { claimReference: string; clientName: string; status: "OPEN" | "CLOSED"; latestPreview: string | null; latestMessageAt: string | null; unreadCount: number; assignee: { staffReference: string; displayName: string | null } | null; claimStatus: ClaimStatus; stageLabel: string; priority: OperationalPriority };

export async function getMessageQueue(clerkUserId: string, input: PageInput & { unread?: string; assignment?: string; conversation?: string; stage?: string; sort?: string } = {}): Promise<QueuePage<AdminMessageQueueItem>> {
  await requirePermission(clerkUserId, "MESSAGES_VIEW");
  const viewer = await staffId(clerkUserId);
  if (!viewer) return { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, hasPreviousPage: false, hasNextPage: false };
  const db = getDb(); const page = pageNumber(input.page); const search = searchValue(input.search); const conditions = [];
  if (search) conditions.push(or(ilike(claims.claimReference, like(search)), ilike(clientProfiles.firstName, like(search)), ilike(clientProfiles.lastName, like(search)))!);
  if (input.conversation === "OPEN" || input.conversation === "CLOSED") conditions.push(eq(claimConversations.status, input.conversation));
  const stages = stageStatuses(input.stage); if (stages) conditions.push(inArray(claims.status, stages));
  const assignment = currentAssignment();
  if (input.assignment === "MINE") conditions.push(eq(claimAssignments.staffUserId, viewer));
  if (input.assignment === "UNASSIGNED") conditions.push(isNull(claimAssignments.id));
  if (input.unread === "yes") conditions.push(sql`exists (select 1 from claim_messages cm left join claim_message_reads mr on mr.conversation_id = cm.conversation_id and mr.viewer_type = 'CLAIMS_BRIDGE' and mr.viewer_id = ${viewer} where cm.conversation_id = claim_conversations.id and cm.sender_type = 'CLIENT' and cm.client_visible = true and (mr.last_read_at is null or cm.created_at > mr.last_read_at))`);
  const where = conditions.length ? and(...conditions) : undefined;
  const order = input.sort === "PRIORITY" ? [desc(sql`case ${claims.operationalPriority} when 'HIGH' then 3 when 'ELEVATED' then 2 else 1 end`), desc(claimConversations.lastMessageAt)] as const : input.sort === "OLDEST_UNREAD" ? [asc(claimConversations.lastMessageAt)] as const : [desc(claimConversations.lastMessageAt), desc(claimConversations.id)] as const;
  const [rows, total] = await Promise.all([
    db.select({ conversationId: claimConversations.id, conversationStatus: claimConversations.status, latestMessageAt: claimConversations.lastMessageAt, claimReference: claims.claimReference, claimStatus: claims.status, priority: claims.operationalPriority, firstName: clientProfiles.firstName, lastName: clientProfiles.lastName, staffReference: staffUsers.staffReference, displayName: staffUsers.displayName }).from(claimConversations).innerJoin(claims, eq(claims.id, claimConversations.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, assignment).leftJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(where).orderBy(...order).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ count: count() }).from(claimConversations).innerJoin(claims, eq(claims.id, claimConversations.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, assignment).where(where),
  ]);
  const ids = rows.map((row) => row.conversationId); const [unread, latest] = await Promise.all([unreadCounts(ids, viewer), latestClientMessages(ids)]); const totalCount = Number(total[0]?.count ?? 0);
  return { items: rows.map((row) => ({ claimReference: row.claimReference, clientName: `${row.firstName} ${row.lastName}`.trim(), status: row.conversationStatus, latestPreview: latest.get(row.conversationId)?.body ?? null, latestMessageAt: iso(row.latestMessageAt), unreadCount: unread.get(row.conversationId) ?? 0, assignee: row.staffReference ? { staffReference: row.staffReference, displayName: row.displayName } : null, claimStatus: row.claimStatus, stageLabel: getClaimStageLabel(claimStatusConfig[row.claimStatus].stage), priority: row.priority })), page, pageSize: PAGE_SIZE, total: totalCount, hasPreviousPage: page > 1, hasNextPage: page * PAGE_SIZE < totalCount };
}

export type AdminEvidenceQueueItem = { requirementReference: string; claimReference: string; clientName: string; type: EvidenceRequirementType; title: string; status: string; required: boolean; priority: string; documentCount: number; requestedAt: string; dueAt: string | null; assignee: { staffReference: string; displayName: string | null } | null; stageLabel: string; clientAttention: boolean };

export async function getEvidenceQueue(clerkUserId: string, input: PageInput & { status?: string; type?: string; priority?: string; assignment?: string; stage?: string; sort?: string } = {}): Promise<QueuePage<AdminEvidenceQueueItem>> {
  await requirePermission(clerkUserId, "EVIDENCE_VIEW");
  const viewer = await staffId(clerkUserId); if (!viewer) return { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, hasPreviousPage: false, hasNextPage: false };
  const db = getDb(); const page = pageNumber(input.page); const conditions = []; const search = searchValue(input.search); const assignment = currentAssignment();
  if (search) conditions.push(or(ilike(claims.claimReference, like(search)), ilike(clientProfiles.firstName, like(search)), ilike(clientProfiles.lastName, like(search)))!);
  if (input.status && (evidenceRequirementStatuses as readonly string[]).includes(input.status)) conditions.push(eq(claimEvidenceRequirements.status, input.status as never)); else conditions.push(inArray(claimEvidenceRequirements.status, ["UPLOADED", "UNDER_REVIEW", "MORE_INFORMATION_REQUIRED"]));
  if (input.type && (evidenceRequirementTypes as readonly string[]).includes(input.type)) conditions.push(eq(claimEvidenceRequirements.type, input.type as EvidenceRequirementType));
  if (input.priority && (evidenceRequirementPriorities as readonly string[]).includes(input.priority)) conditions.push(eq(claimEvidenceRequirements.priority, input.priority as never));
  const stages = stageStatuses(input.stage); if (stages) conditions.push(inArray(claims.status, stages));
  if (input.assignment === "MINE") conditions.push(eq(claimAssignments.staffUserId, viewer)); if (input.assignment === "UNASSIGNED") conditions.push(isNull(claimAssignments.id));
  const where = and(eq(claimEvidenceRequirements.clientVisible, true), ...conditions); const order = input.sort === "PRIORITY" ? [desc(sql`case ${claimEvidenceRequirements.priority} when 'HIGH' then 3 when 'NORMAL' then 2 else 1 end`), asc(claimEvidenceRequirements.createdAt)] as const : input.sort === "DUE" ? [asc(claimEvidenceRequirements.dueAt), asc(claimEvidenceRequirements.createdAt)] as const : [asc(claimEvidenceRequirements.createdAt), asc(claimEvidenceRequirements.id)] as const;
  const [rows, total] = await Promise.all([
    db.select({ requirementReference: claimEvidenceRequirements.requirementReference, type: claimEvidenceRequirements.type, title: claimEvidenceRequirements.title, status: claimEvidenceRequirements.status, required: claimEvidenceRequirements.required, priority: claimEvidenceRequirements.priority, createdAt: claimEvidenceRequirements.createdAt, dueAt: claimEvidenceRequirements.dueAt, documentCount: count(claimDocuments.id), claimReference: claims.claimReference, claimStatus: claims.status, firstName: clientProfiles.firstName, lastName: clientProfiles.lastName, staffReference: staffUsers.staffReference, displayName: staffUsers.displayName }).from(claimEvidenceRequirements).innerJoin(claims, eq(claims.id, claimEvidenceRequirements.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimDocuments, eq(claimDocuments.evidenceRequirementId, claimEvidenceRequirements.id)).leftJoin(claimAssignments, assignment).leftJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(where).groupBy(claimEvidenceRequirements.id, claims.id, clientProfiles.id, staffUsers.id).orderBy(...order).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ count: count() }).from(claimEvidenceRequirements).innerJoin(claims, eq(claims.id, claimEvidenceRequirements.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, assignment).where(where),
  ]);
  const totalCount = Number(total[0]?.count ?? 0); return { items: rows.map((row) => ({ requirementReference: row.requirementReference, claimReference: row.claimReference, clientName: `${row.firstName} ${row.lastName}`.trim(), type: row.type, title: row.title || evidenceRequirementConfig[row.type].label, status: row.status, required: row.required, priority: row.priority, documentCount: Number(row.documentCount), requestedAt: row.createdAt.toISOString(), dueAt: iso(row.dueAt), assignee: row.staffReference ? { staffReference: row.staffReference, displayName: row.displayName } : null, stageLabel: getClaimStageLabel(claimStatusConfig[row.claimStatus].stage), clientAttention: row.status === "REQUESTED" || row.status === "MORE_INFORMATION_REQUIRED" })), page, pageSize: PAGE_SIZE, total: totalCount, hasPreviousPage: page > 1, hasNextPage: page * PAGE_SIZE < totalCount };
}

export type AdminDocumentQueueItem = { documentReference: string | null; displayName: string; category: string; securityStatus: string; status: string; claimReference: string; clientName: string; requirementReference: string | null; uploadedAt: string | null; assignee: { staffReference: string; displayName: string | null } | null; stageLabel: string; reviewAvailable: boolean };

export async function getDocumentQueue(clerkUserId: string, input: PageInput & { securityStatus?: string; status?: string; category?: string; assignment?: string; stage?: string } = {}): Promise<QueuePage<AdminDocumentQueueItem>> {
  await requirePermission(clerkUserId, "DOCUMENTS_VIEW"); const viewer = await staffId(clerkUserId); if (!viewer) return { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, hasPreviousPage: false, hasNextPage: false };
  const db = getDb(); const page = pageNumber(input.page); const conditions = []; const search = searchValue(input.search); const assignment = currentAssignment();
  if (search) conditions.push(or(ilike(claims.claimReference, like(search)), ilike(clientProfiles.firstName, like(search)), ilike(clientProfiles.lastName, like(search)))!);
  if (input.securityStatus && (documentSecurityStatuses as readonly string[]).includes(input.securityStatus)) conditions.push(eq(claimDocuments.securityStatus, input.securityStatus as never));
  if (input.status && (documentStatuses as readonly string[]).includes(input.status)) conditions.push(eq(claimDocuments.status, input.status as never));
  if (input.category && (documentCategories as readonly string[]).includes(input.category)) conditions.push(eq(claimDocuments.category, input.category as never));
  const stages = stageStatuses(input.stage); if (stages) conditions.push(inArray(claims.status, stages)); if (input.assignment === "MINE") conditions.push(eq(claimAssignments.staffUserId, viewer)); if (input.assignment === "UNASSIGNED") conditions.push(isNull(claimAssignments.id));
  const where = conditions.length ? and(...conditions) : undefined; const [rows, total] = await Promise.all([
    db.select({ documentReference: claimDocuments.documentReference, displayName: claimDocuments.displayName, category: claimDocuments.category, securityStatus: claimDocuments.securityStatus, status: claimDocuments.status, uploadedAt: claimDocuments.uploadedAt, requirementReference: claimEvidenceRequirements.requirementReference, claimReference: claims.claimReference, claimStatus: claims.status, firstName: clientProfiles.firstName, lastName: clientProfiles.lastName, staffReference: staffUsers.staffReference, assigneeName: staffUsers.displayName }).from(claimDocuments).innerJoin(claims, eq(claims.id, claimDocuments.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimEvidenceRequirements, eq(claimEvidenceRequirements.id, claimDocuments.evidenceRequirementId)).leftJoin(claimAssignments, assignment).leftJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(where).orderBy(desc(claimDocuments.createdAt), desc(claimDocuments.id)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ count: count() }).from(claimDocuments).innerJoin(claims, eq(claims.id, claimDocuments.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, assignment).where(where),
  ]); const totalCount = Number(total[0]?.count ?? 0); return { items: rows.map((row) => ({ documentReference: row.documentReference, displayName: row.displayName, category: row.category, securityStatus: row.securityStatus, status: row.status, claimReference: row.claimReference, clientName: `${row.firstName} ${row.lastName}`.trim(), requirementReference: row.requirementReference, uploadedAt: iso(row.uploadedAt), assignee: row.staffReference ? { staffReference: row.staffReference, displayName: row.assigneeName } : null, stageLabel: getClaimStageLabel(claimStatusConfig[row.claimStatus].stage), reviewAvailable: isDocumentReviewAvailable() })), page, pageSize: PAGE_SIZE, total: totalCount, hasPreviousPage: page > 1, hasNextPage: page * PAGE_SIZE < totalCount };
}

export type AdminClientActionQueueItem = { actionReference: string; claimReference: string; clientName: string; type: ClientActionType; title: string; priority: ClientActionPriority; status: ClientActionStatus; dueAt: string | null; createdAt: string; assignee: { staffReference: string; displayName: string | null } | null; stageLabel: string };

export async function getClientActionQueue(clerkUserId: string, input: PageInput & { status?: string; type?: string; priority?: string; assignment?: string; due?: string } = {}): Promise<QueuePage<AdminClientActionQueueItem>> {
  await requirePermission(clerkUserId, "CLAIMS_VIEW"); const viewer = await staffId(clerkUserId); if (!viewer) return { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, hasPreviousPage: false, hasNextPage: false };
  const db = getDb(); const page = pageNumber(input.page); const conditions = []; const search = searchValue(input.search); const assignment = currentAssignment();
  if (search) conditions.push(or(ilike(claims.claimReference, like(search)), ilike(clientProfiles.firstName, like(search)), ilike(clientProfiles.lastName, like(search)))!);
  if (input.status && (clientActionStatuses as readonly string[]).includes(input.status)) conditions.push(eq(claimActionRequirements.status, input.status as ClientActionStatus)); else conditions.push(eq(claimActionRequirements.status, "OPEN"));
  if (input.type && (clientActionTypes as readonly string[]).includes(input.type)) conditions.push(eq(claimActionRequirements.type, input.type as ClientActionType)); if (input.priority && (clientActionPriorities as readonly string[]).includes(input.priority)) conditions.push(eq(claimActionRequirements.priority, input.priority as ClientActionPriority));
  if (input.due === "OVERDUE") conditions.push(lt(claimActionRequirements.dueAt, new Date())); if (input.due === "DUE") conditions.push(and(gt(claimActionRequirements.dueAt, new Date()), lt(claimActionRequirements.dueAt, new Date(Date.now() + 7 * 86400000))));
  if (input.assignment === "MINE") conditions.push(eq(claimAssignments.staffUserId, viewer)); if (input.assignment === "UNASSIGNED") conditions.push(isNull(claimAssignments.id));
  const where = and(eq(claimActionRequirements.clientVisible, true), ...conditions); const [rows, total] = await Promise.all([
    db.select({ actionReference: claimActionRequirements.actionReference, type: claimActionRequirements.type, title: claimActionRequirements.title, priority: claimActionRequirements.priority, status: claimActionRequirements.status, dueAt: claimActionRequirements.dueAt, createdAt: claimActionRequirements.createdAt, claimReference: claims.claimReference, claimStatus: claims.status, firstName: clientProfiles.firstName, lastName: clientProfiles.lastName, staffReference: staffUsers.staffReference, displayName: staffUsers.displayName }).from(claimActionRequirements).innerJoin(claims, eq(claims.id, claimActionRequirements.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, assignment).leftJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(where).orderBy(desc(sql`case ${claimActionRequirements.priority} when 'IMPORTANT' then 2 else 1 end`), asc(claimActionRequirements.dueAt), asc(claimActionRequirements.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ count: count() }).from(claimActionRequirements).innerJoin(claims, eq(claims.id, claimActionRequirements.claimId)).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, assignment).where(where),
  ]); const totalCount = Number(total[0]?.count ?? 0); return { items: rows.map((row) => ({ actionReference: row.actionReference, claimReference: row.claimReference, clientName: `${row.firstName} ${row.lastName}`.trim(), type: row.type, title: row.title, priority: row.priority, status: row.status, dueAt: iso(row.dueAt), createdAt: row.createdAt.toISOString(), assignee: row.staffReference ? { staffReference: row.staffReference, displayName: row.displayName } : null, stageLabel: getClaimStageLabel(claimStatusConfig[row.claimStatus].stage) })), page, pageSize: PAGE_SIZE, total: totalCount, hasPreviousPage: page > 1, hasNextPage: page * PAGE_SIZE < totalCount };
}

export type AdminClientDirectoryItem = { clientReference: string; name: string; preferredContactMethod: string; onboardingStatus: string; claimCount: number; activeClaimCount: number; latestClaimReference: string | null; latestStageLabel: string | null; latestActivityAt: string | null };

export async function getClientDirectory(clerkUserId: string, input: PageInput & { sort?: string } = {}): Promise<QueuePage<AdminClientDirectoryItem>> {
  await requirePermission(clerkUserId, "CLIENTS_VIEW"); const db = getDb(); const page = pageNumber(input.page); const search = searchValue(input.search); const where = search ? or(ilike(clientProfiles.clientReference, like(search)), ilike(clientProfiles.firstName, like(search)), ilike(clientProfiles.lastName, like(search))) : undefined;
  const [profiles, total] = await Promise.all([db.select().from(clientProfiles).where(where).orderBy(input.sort === "NAME" ? asc(clientProfiles.lastName) : desc(clientProfiles.updatedAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE), db.select({ count: count() }).from(clientProfiles).where(where)]); const ids = profiles.map((profile) => profile.id);
  const claimRows = ids.length ? await db.select({ clientProfileId: claims.clientProfileId, claimReference: claims.claimReference, status: claims.status, updatedAt: claims.updatedAt }).from(claims).where(inArray(claims.clientProfileId, ids)).orderBy(desc(claims.updatedAt)) : [];
  const byProfile = new Map<string, typeof claimRows>(); for (const row of claimRows) byProfile.set(row.clientProfileId, [...(byProfile.get(row.clientProfileId) ?? []), row]); const totalCount = Number(total[0]?.count ?? 0);
  return { items: profiles.map((profile) => { const rows = byProfile.get(profile.id) ?? []; const latest = rows[0]; return { clientReference: profile.clientReference, name: `${profile.firstName} ${profile.lastName}`.trim(), preferredContactMethod: profile.preferredContactMethod, onboardingStatus: profile.onboardingStatus, claimCount: rows.length, activeClaimCount: rows.filter((row) => !isTerminalClaimStatus(row.status)).length, latestClaimReference: latest?.claimReference ?? null, latestStageLabel: latest ? getClaimStageLabel(claimStatusConfig[latest.status].stage) : null, latestActivityAt: iso(latest?.updatedAt) }; }), page, pageSize: PAGE_SIZE, total: totalCount, hasPreviousPage: page > 1, hasNextPage: page * PAGE_SIZE < totalCount };
}

export async function getClientOperationalProfile(clerkUserId: string, clientReference: string) {
  await requirePermission(clerkUserId, "CLIENTS_VIEW"); const db = getDb(); const profile = (await db.select().from(clientProfiles).where(eq(clientProfiles.clientReference, clientReference)).limit(1))[0]; if (!profile) return undefined;
  const rows = await db.select({ id: claims.id, claimReference: claims.claimReference, status: claims.status, priority: claims.operationalPriority, createdAt: claims.createdAt, updatedAt: claims.updatedAt, assigneeReference: staffUsers.staffReference, assigneeName: staffUsers.displayName }).from(claims).leftJoin(claimAssignments, currentAssignment()).leftJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(eq(claims.clientProfileId, profile.id)).orderBy(desc(claims.updatedAt));
  const claimIds = rows.map((row) => row.id);
  const actions = claimIds.length ? await db.select({ claimId: claimActionRequirements.claimId, count: count() }).from(claimActionRequirements).where(and(inArray(claimActionRequirements.claimId, claimIds), eq(claimActionRequirements.status, "OPEN"), eq(claimActionRequirements.clientVisible, true))).groupBy(claimActionRequirements.claimId) : [];
  const actionCounts = new Map(actions.map((action) => [action.claimId, Number(action.count)]));
  return { clientReference: profile.clientReference, name: `${profile.firstName} ${profile.lastName}`.trim(), firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone, preferredContactMethod: profile.preferredContactMethod, onboardingStatus: profile.onboardingStatus, createdAt: profile.createdAt.toISOString(), updatedAt: profile.updatedAt.toISOString(), claims: rows.map((row) => ({ claimReference: row.claimReference, status: row.status, statusLabel: claimStatusConfig[row.status].label, stageLabel: getClaimStageLabel(claimStatusConfig[row.status].stage), priority: operationalPriorityLabels[row.priority], createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), assignee: row.assigneeReference ? { staffReference: row.assigneeReference, displayName: row.assigneeName } : null, openActionCount: actionCounts.get(row.id) ?? 0 })) };
}

export async function searchAdminEntities(clerkUserId: string, value: string) {
  const context = await requireStaff(clerkUserId); const query = searchValue(value); if (!query || query.length < 2) return { claims: [], clients: [] };
  const db = getDb(); const results: { claims: Array<{ claimReference: string; clientName: string; statusLabel: string }>; clients: Array<{ clientReference: string; name: string; claimCount: number }> } = { claims: [], clients: [] };
  if (context.permissions.includes("CLAIMS_VIEW")) { const rows = await db.select({ claimReference: claims.claimReference, status: claims.status, firstName: clientProfiles.firstName, lastName: clientProfiles.lastName }).from(claims).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).where(or(ilike(claims.claimReference, like(query)), ilike(clientProfiles.firstName, like(query)), ilike(clientProfiles.lastName, like(query)))).orderBy(desc(claims.updatedAt)).limit(5); results.claims = rows.map((row) => ({ claimReference: row.claimReference, clientName: `${row.firstName} ${row.lastName}`.trim(), statusLabel: claimStatusConfig[row.status].label })); }
  if (context.permissions.includes("CLIENTS_VIEW")) { const rows = await db.select({ clientReference: clientProfiles.clientReference, firstName: clientProfiles.firstName, lastName: clientProfiles.lastName }).from(clientProfiles).where(or(ilike(clientProfiles.clientReference, like(query)), ilike(clientProfiles.firstName, like(query)), ilike(clientProfiles.lastName, like(query)))).orderBy(asc(clientProfiles.lastName)).limit(5); const ids = rows.map((row) => row.clientReference); results.clients = rows.map((row) => ({ clientReference: row.clientReference, name: `${row.firstName} ${row.lastName}`.trim(), claimCount: 0 })); if (ids.length) { const counts = await db.select({ clientReference: clientProfiles.clientReference, claimCount: count(claims.id) }).from(clientProfiles).leftJoin(claims, eq(claims.clientProfileId, clientProfiles.id)).where(inArray(clientProfiles.clientReference, ids)).groupBy(clientProfiles.clientReference); const countMap = new Map(counts.map((row) => [row.clientReference, Number(row.claimCount)])); results.clients = results.clients.map((row) => ({ ...row, claimCount: countMap.get(row.clientReference) ?? 0 })); } }
  return results;
}

export async function getStaffWorkload(clerkUserId: string) {
  const context = await requirePermission(clerkUserId, "STAFF_VIEW"); if (!context.permissions.includes("CLAIMS_VIEW")) return [];
  const db = getDb(); const assignableRoles = (Object.keys(rolePermissions) as StaffRole[]).filter((role) => rolePermissions[role].includes("CLAIMS_MANAGE"));
  const rows = await db.select({ staffReference: staffUsers.staffReference, displayName: staffUsers.displayName, role: staffUsers.role, assignedActive: sql<number>`count(distinct case when ${claims.id} is not null and ${claims.status} not in ('COMPLETED','CLOSED','NOT_ELIGIBLE') then ${claims.id} end)`, attention: sql<number>`count(distinct case when ${claims.id} is not null and (${claims.operationalPriority} = 'HIGH' or exists (select 1 from claim_action_requirements car where car.claim_id = ${claims.id} and car.status = 'OPEN') or exists (select 1 from claim_evidence_requirements cer where cer.claim_id = ${claims.id} and cer.status in ('UPLOADED','MORE_INFORMATION_REQUIRED'))) then ${claims.id} end)` }).from(staffUsers).leftJoin(claimAssignments, and(eq(claimAssignments.staffUserId, staffUsers.id), isNull(claimAssignments.unassignedAt))).leftJoin(claims, eq(claims.id, claimAssignments.claimId)).where(and(eq(staffUsers.status, "ACTIVE"), inArray(staffUsers.role, assignableRoles))).groupBy(staffUsers.id).orderBy(asc(staffUsers.displayName));
  return rows.map((row) => ({ staffReference: row.staffReference, displayName: row.displayName, role: row.role, assignedActiveClaims: Number(row.assignedActive), needsAttention: Number(row.attention) }));
}

export async function getAdminOperationsSummary(clerkUserId: string) {
  const context = await requireStaff(clerkUserId); const db = getDb(); const current = currentAssignment(); const result = { activeClaims: 0, assignedToMe: 0, unassigned: 0, unreadMessages: 0, evidenceReview: 0, documentsReview: 0, openActions: 0 };
  if (context.permissions.includes("CLAIMS_VIEW")) { const me = await staffId(clerkUserId); const [active, assigned, unassigned] = await Promise.all([db.select({ count: count() }).from(claims).where(sql`${claims.status} not in (${sql.join(TERMINAL_STATUSES.map((status) => sql`${status}`), sql`, `)})`), me ? db.select({ count: count() }).from(claimAssignments).innerJoin(claims, eq(claims.id, claimAssignments.claimId)).where(and(eq(claimAssignments.staffUserId, me), isNull(claimAssignments.unassignedAt), sql`${claims.status} not in (${sql.join(TERMINAL_STATUSES.map((status) => sql`${status}`), sql`, `)})`)) : Promise.resolve([{ count: 0 }]), db.select({ count: count() }).from(claims).leftJoin(claimAssignments, current).where(isNull(claimAssignments.id))]); result.activeClaims = Number(active[0]?.count ?? 0); result.assignedToMe = Number(assigned[0]?.count ?? 0); result.unassigned = Number(unassigned[0]?.count ?? 0); }
  if (context.permissions.includes("MESSAGES_VIEW")) { const me = await staffId(clerkUserId); if (me) { const rows = await db.select({ count: count() }).from(claimMessages).leftJoin(claimMessageReads, and(eq(claimMessageReads.conversationId, claimMessages.conversationId), eq(claimMessageReads.viewerType, "CLAIMS_BRIDGE"), eq(claimMessageReads.viewerId, me))).where(and(eq(claimMessages.senderType, "CLIENT"), eq(claimMessages.clientVisible, true), or(isNull(claimMessageReads.lastReadAt), gt(claimMessages.createdAt, claimMessageReads.lastReadAt)))); result.unreadMessages = Number(rows[0]?.count ?? 0); } }
  if (context.permissions.includes("EVIDENCE_VIEW")) result.evidenceReview = Number((await db.select({ count: count() }).from(claimEvidenceRequirements).where(inArray(claimEvidenceRequirements.status, ["UPLOADED", "UNDER_REVIEW"] as never[])))[0]?.count ?? 0);
  if (context.permissions.includes("DOCUMENTS_VIEW")) result.documentsReview = Number((await db.select({ count: count() }).from(claimDocuments).where(inArray(claimDocuments.status, ["UPLOADED", "UNDER_REVIEW"] as never[])))[0]?.count ?? 0);
  if (context.permissions.includes("CLAIMS_VIEW")) result.openActions = Number((await db.select({ count: count() }).from(claimActionRequirements).where(and(eq(claimActionRequirements.status, "OPEN"), eq(claimActionRequirements.clientVisible, true))))[0]?.count ?? 0);
  return result;
}

export type AdminAttentionItem = { reason: string; detail: string; href: string };

export async function getAdminAttentionItems(clerkUserId: string): Promise<AdminAttentionItem[]> {
  const context = await requireStaff(clerkUserId);
  const [messages, evidence, actions] = await Promise.all([
    context.permissions.includes("MESSAGES_VIEW") ? getMessageQueue(clerkUserId, { unread: "yes", page: "1" }) : Promise.resolve(null),
    context.permissions.includes("EVIDENCE_VIEW") ? getEvidenceQueue(clerkUserId, { page: "1" }) : Promise.resolve(null),
    context.permissions.includes("CLAIMS_VIEW") ? getClientActionQueue(clerkUserId, { priority: "IMPORTANT", page: "1" }) : Promise.resolve(null),
  ]);
  const items: AdminAttentionItem[] = [];
  const message = messages?.items[0];
  if (message) items.push({ reason: "Unread client message", detail: `${message.claimReference} · ${message.clientName}`, href: `/admin/claims/${message.claimReference}/messages` });
  const evidenceItem = evidence?.items[0];
  if (evidenceItem) items.push({ reason: "Evidence awaiting review", detail: `${evidenceItem.claimReference} · ${evidenceItem.title}`, href: `/admin/claims/${evidenceItem.claimReference}/evidence` });
  const action = actions?.items[0];
  if (action) items.push({ reason: "Important client action", detail: `${action.claimReference} · ${action.title}`, href: `/admin/claims/${action.claimReference}` });
  return items.slice(0, 5);
}
