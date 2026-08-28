import "server-only";

import { and, asc, count, desc, eq, gt, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { claimAssignmentFilters, claimQueueSorts, getClaimStageLabel, getClaimQueueWaitingOn, isClaimAssignmentFilter, isClaimQueueSort, isOperationalPriority, operationalPriorityLabels, queuePageSize, type ClaimAssignmentFilter, type ClaimQueueSort, type OperationalPriority } from "@/config/admin-claims";
import { canTransitionClaimStatus, claimStageConfig, claimStatusConfig, claimStatuses, isTerminalClaimStatus, type ClaimStage, type ClaimStatus } from "@/config/claim-statuses";
import { claimWaitingOnLabels, getClaimWaitingOn } from "@/config/claim-tracking";
import { type EvidenceRequirementStatus } from "@/config/evidence";
import { messageSenderLabels } from "@/config/messaging";
import { staffRoleLabels, hasPermissionForRole } from "@/config/staff";
import { getDb } from "@/lib/db";
import { clientNotifications } from "@/lib/db/schema/notifications";
import { clientProfiles } from "@/lib/db/schema/client-profiles";
import { eligibilityAssessments } from "@/lib/db/schema/eligibility";
import { claimEvidenceRequirements, claimDocuments } from "@/lib/db/schema/evidence";
import { claimActionRequirements } from "@/lib/db/schema/actions";
import { claimConversations, claimMessageReads, claimMessages } from "@/lib/db/schema/messaging";
import { claimAssignments, claimInternalNotes } from "@/lib/db/schema/operations";
import { claimStatusHistory, claimTimelineEvents, claims } from "@/lib/db/schema/claims";
import { staffUsers } from "@/lib/db/schema/staff";
import { requirePermission } from "@/lib/staff/authorization";
import { getStaffAuditEventsForViewer } from "@/lib/staff/repository";
import { deriveEvidenceSummary, type EvidenceSummary } from "@/lib/evidence/summary";
import { isDocumentReviewAvailable } from "@/lib/documents/service";

export type ClaimQueueFilters = {
  search?: string;
  status?: ClaimStatus;
  stage?: ClaimStage;
  priority?: OperationalPriority;
  assignment?: ClaimAssignmentFilter;
  waitingOn?: "CLIENT" | "CLAIMS_BRIDGE" | "THIRD_PARTY" | "NONE";
  evidenceAttention?: boolean;
  sort?: ClaimQueueSort;
  page?: number;
};

export type AdminClaimQueueItem = {
  claimReference: string;
  clientName: string;
  status: ClaimStatus;
  statusLabel: string;
  stage: ClaimStage;
  stageLabel: string;
  priority: OperationalPriority;
  priorityLabel: string;
  waitingOn: string;
  waitingOnLabel: string;
  createdAt: string;
  submittedAt: string | null;
  latestActivityAt: string;
  assignedTo: { staffReference: string; displayName: string | null; role: string } | null;
  evidence: EvidenceSummary;
  unreadMessageCount: number;
  openActionCount: number;
};

export type AdminQueueResult = {
  items: readonly AdminClaimQueueItem[];
  page: number;
  pageSize: number;
  total: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export type AdminQueueSummary = { total: number; unassigned: number; assignedToMe: number; needsAttention: number };

function iso(date: Date | null | undefined) {
  return date?.toISOString() ?? null;
}

function stageStatuses(stage: ClaimStage) {
  return claimStatuses.filter((status) => claimStatusConfig[status].stage === stage);
}

function waitingStatuses(waitingOn: ClaimQueueFilters["waitingOn"]) {
  return claimStatuses.filter((status) => getClaimWaitingOn(status) === waitingOn);
}

export function parseClaimQueueFilters(input: Record<string, string | string[] | undefined>): ClaimQueueFilters {
  const one = (key: string) => (typeof input[key] === "string" ? input[key] : undefined);
  const status = one("status");
  const stage = one("stage");
  const priority = one("priority");
  const assignment = one("assignment");
  const waitingOn = one("waitingOn");
  const sort = one("sort");
  const pageValue = Number(one("page") ?? "1");
  return {
    search: one("search")?.trim().slice(0, 100) || undefined,
    status: status && (claimStatuses as readonly string[]).includes(status) ? status as ClaimStatus : undefined,
    stage: stage && claimStageConfig.some((item) => item.id === stage) ? stage as ClaimStage : undefined,
    priority: priority && isOperationalPriority(priority) ? priority : undefined,
    assignment: assignment && isClaimAssignmentFilter(assignment) ? assignment : undefined,
    waitingOn: waitingOn && ["CLIENT", "CLAIMS_BRIDGE", "THIRD_PARTY", "NONE"].includes(waitingOn) ? waitingOn as ClaimQueueFilters["waitingOn"] : undefined,
    evidenceAttention: one("evidence") === "yes" ? true : one("evidence") === "no" ? false : undefined,
    sort: sort && isClaimQueueSort(sort) ? sort : undefined,
    page: Number.isInteger(pageValue) ? Math.min(1000, Math.max(1, pageValue)) : 1,
  };
}

function queueConditions(filters: ClaimQueueFilters, actorStaffId: string) {
  const conditions = [];
  if (filters.search) {
    const search = `%${filters.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    conditions.push(or(ilike(claims.claimReference, search), ilike(clientProfiles.firstName, search), ilike(clientProfiles.lastName, search))!);
  }
  if (filters.status) conditions.push(eq(claims.status, filters.status));
  if (filters.stage) conditions.push(inArray(claims.status, stageStatuses(filters.stage)));
  if (filters.priority) conditions.push(eq(claims.operationalPriority, filters.priority));
  if (filters.waitingOn) conditions.push(inArray(claims.status, waitingStatuses(filters.waitingOn)));
  if (filters.assignment === "MINE") conditions.push(eq(claimAssignments.staffUserId, actorStaffId));
  if (filters.assignment === "UNASSIGNED") conditions.push(isNull(claimAssignments.id));
  if (filters.assignment === "ASSIGNED") conditions.push(isNotNull(claimAssignments.id));
  const attentionSql = sql`(exists (select 1 from claim_evidence_requirements cer where cer.claim_id = ${claims.id} and cer.required = true and cer.status in ('REQUESTED', 'MORE_INFORMATION_REQUIRED')) or exists (select 1 from claim_action_requirements car where car.claim_id = ${claims.id} and car.client_visible = true and car.status = 'OPEN'))`;
  if (filters.evidenceAttention === true) conditions.push(attentionSql);
  if (filters.evidenceAttention === false) conditions.push(sql`not ${attentionSql}`);
  return conditions.length > 0 ? and(...conditions) : undefined;
}

function orderFor(sort: ClaimQueueSort) {
  if (sort === "OLDEST") return [asc(claims.createdAt), asc(claims.id)] as const;
  if (sort === "RECENTLY_ACTIVE") return [desc(claims.updatedAt), desc(claims.id)] as const;
  if (sort === "PRIORITY") return [desc(sql`case ${claims.operationalPriority} when 'HIGH' then 3 when 'ELEVATED' then 2 else 1 end`), desc(claims.updatedAt), desc(claims.id)] as const;
  return [desc(claims.createdAt), desc(claims.id)] as const;
}

async function getStaffId(clerkUserId: string) {
  const row = (await getDb().select({ id: staffUsers.id }).from(staffUsers).where(eq(staffUsers.clerkUserId, clerkUserId)).limit(1))[0];
  return row?.id;
}

async function getEvidenceSummaries(claimIds: string[]) {
  if (claimIds.length === 0) return new Map<string, EvidenceSummary>();
  const db = getDb();
  const rows = await db.select({ claimId: claimEvidenceRequirements.claimId, status: claimEvidenceRequirements.status, required: claimEvidenceRequirements.required, documentCount: count(claimDocuments.id) }).from(claimEvidenceRequirements).leftJoin(claimDocuments, eq(claimDocuments.evidenceRequirementId, claimEvidenceRequirements.id)).where(inArray(claimEvidenceRequirements.claimId, claimIds)).groupBy(claimEvidenceRequirements.id);
  const byClaim = new Map<string, Array<{ status: EvidenceRequirementStatus; required: boolean; documentCount: number }>>();
  for (const row of rows) {
    const list = byClaim.get(row.claimId) ?? [];
    list.push({ status: row.status, required: row.required, documentCount: Number(row.documentCount ?? 0) });
    byClaim.set(row.claimId, list);
  }
  return new Map(claimIds.map((id) => [id, deriveEvidenceSummary(byClaim.get(id) ?? [])]));
}

async function getUnreadMessageCounts(claimIds: string[], staffId: string) {
  if (claimIds.length === 0) return new Map<string, number>();
  const db = getDb();
  const rows = await db.select({ claimId: claims.id, unreadCount: count(claimMessages.id) }).from(claimMessages).innerJoin(claimConversations, eq(claimConversations.id, claimMessages.conversationId)).innerJoin(claims, eq(claims.id, claimConversations.claimId)).leftJoin(claimMessageReads, and(eq(claimMessageReads.conversationId, claimConversations.id), eq(claimMessageReads.viewerType, "CLAIMS_BRIDGE"), eq(claimMessageReads.viewerId, staffId))).where(and(inArray(claims.id, claimIds), eq(claimMessages.clientVisible, true), eq(claimMessages.senderType, "CLIENT"), or(isNull(claimMessageReads.lastReadAt), gt(claimMessages.createdAt, claimMessageReads.lastReadAt)))).groupBy(claims.id);
  return new Map(rows.map((row) => [row.claimId, Number(row.unreadCount)]));
}

async function getLatestActivity(claimIds: string[]) {
  if (claimIds.length === 0) return new Map<string, Date>();
  const db = getDb();
  const rows = await db.select({ claimId: claimTimelineEvents.claimId, latest: sql<Date>`max(${claimTimelineEvents.occurredAt})` }).from(claimTimelineEvents).where(and(inArray(claimTimelineEvents.claimId, claimIds), eq(claimTimelineEvents.visibility, "CLIENT"))).groupBy(claimTimelineEvents.claimId);
  return new Map(rows.map((row) => [row.claimId, row.latest]));
}

export async function searchClaimsForStaff(clerkUserId: string, filters: ClaimQueueFilters = {}): Promise<AdminQueueResult> {
  await requirePermission(clerkUserId, "CLAIMS_VIEW");
  const actorStaffId = await getStaffId(clerkUserId);
  if (!actorStaffId) return { items: [], page: 1, pageSize: queuePageSize, total: 0, hasPreviousPage: false, hasNextPage: false };
  const db = getDb();
  const currentAssignment = and(eq(claimAssignments.claimId, claims.id), isNull(claimAssignments.unassignedAt));
  const where = queueConditions(filters, actorStaffId);
  const [rows, totalRow] = await Promise.all([
    db.select({ id: claims.id, claimReference: claims.claimReference, status: claims.status, operationalPriority: claims.operationalPriority, createdAt: claims.createdAt, submittedAt: claims.submittedAt, updatedAt: claims.updatedAt, firstName: clientProfiles.firstName, lastName: clientProfiles.lastName, assignedStaffReference: staffUsers.staffReference, assignedDisplayName: staffUsers.displayName, assignedRole: staffUsers.role }).from(claims).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, currentAssignment).leftJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(where).orderBy(...orderFor(filters.sort ?? "NEWEST")).limit(queuePageSize).offset(((filters.page ?? 1) - 1) * queuePageSize),
    db.select({ count: count() }).from(claims).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(claimAssignments, currentAssignment).where(where),
  ]);
  const claimIds = rows.map((row) => row.id);
  const [evidence, unread, latestActivity, actionRows] = await Promise.all([getEvidenceSummaries(claimIds), getUnreadMessageCounts(claimIds, actorStaffId), getLatestActivity(claimIds), claimIds.length ? db.select({ claimId: claimActionRequirements.claimId }).from(claimActionRequirements).where(and(inArray(claimActionRequirements.claimId, claimIds), eq(claimActionRequirements.clientVisible, true), eq(claimActionRequirements.status, "OPEN"))) : Promise.resolve([])]);
  const actionCounts = new Map<string, number>();
  for (const row of actionRows) actionCounts.set(row.claimId, (actionCounts.get(row.claimId) ?? 0) + 1);
  const page = filters.page ?? 1;
  return { items: rows.map((row) => { const statusConfig = claimStatusConfig[row.status]; const waitingOn = getClaimQueueWaitingOn(row.status); return { claimReference: row.claimReference, clientName: `${row.firstName} ${row.lastName}`.trim(), status: row.status, statusLabel: statusConfig.label, stage: statusConfig.stage, stageLabel: getClaimStageLabel(statusConfig.stage), priority: row.operationalPriority, priorityLabel: operationalPriorityLabels[row.operationalPriority], waitingOn, waitingOnLabel: claimWaitingOnLabels[waitingOn], createdAt: row.createdAt.toISOString(), submittedAt: iso(row.submittedAt), latestActivityAt: (latestActivity.get(row.id) ?? row.updatedAt).toISOString(), assignedTo: row.assignedStaffReference ? { staffReference: row.assignedStaffReference, displayName: row.assignedDisplayName, role: staffRoleLabels[row.assignedRole!] } : null, evidence: evidence.get(row.id) ?? deriveEvidenceSummary([]), unreadMessageCount: unread.get(row.id) ?? 0, openActionCount: actionCounts.get(row.id) ?? 0 }; }), page, pageSize: queuePageSize, total: Number(totalRow[0]?.count ?? 0), hasPreviousPage: page > 1, hasNextPage: page * queuePageSize < Number(totalRow[0]?.count ?? 0) };
}

export async function getAdminQueueSummary(clerkUserId: string): Promise<AdminQueueSummary> {
  await requirePermission(clerkUserId, "CLAIMS_VIEW");
  const actorStaffId = await getStaffId(clerkUserId);
  if (!actorStaffId) return { total: 0, unassigned: 0, assignedToMe: 0, needsAttention: 0 };
  const db = getDb();
  const currentAssignment = and(eq(claimAssignments.claimId, claims.id), isNull(claimAssignments.unassignedAt));
  const [total, unassigned, assignedToMe, needsAttention] = await Promise.all([
    db.select({ count: count() }).from(claims),
    db.select({ count: count() }).from(claims).leftJoin(claimAssignments, currentAssignment).where(isNull(claimAssignments.id)),
    db.select({ count: count() }).from(claims).innerJoin(claimAssignments, currentAssignment).where(eq(claimAssignments.staffUserId, actorStaffId)),
    db.select({ count: count() }).from(claims).where(or(eq(claims.status, "AWAITING_CLIENT"), sql`exists (select 1 from claim_evidence_requirements cer where cer.claim_id = ${claims.id} and cer.required = true and cer.status in ('REQUESTED', 'MORE_INFORMATION_REQUIRED'))`, sql`exists (select 1 from claim_action_requirements car where car.claim_id = ${claims.id} and car.client_visible = true and car.status = 'OPEN')`)),
  ]);
  return { total: Number(total[0]?.count ?? 0), unassigned: Number(unassigned[0]?.count ?? 0), assignedToMe: Number(assignedToMe[0]?.count ?? 0), needsAttention: Number(needsAttention[0]?.count ?? 0) };
}

export async function getAssignableStaffForClaims(clerkUserId: string) {
  const context = await requirePermission(clerkUserId, "CLAIMS_MANAGE");
  const allowedRoles = Object.keys(staffRoleLabels).filter((role) => hasPermissionForRole(role as never, "CLAIMS_MANAGE"));
  const db = getDb();
  const rows = await db.select({ staffReference: staffUsers.staffReference, displayName: staffUsers.displayName, role: staffUsers.role }).from(staffUsers).where(and(eq(staffUsers.status, "ACTIVE"), inArray(staffUsers.role, allowedRoles as never[]))).orderBy(asc(staffUsers.displayName), asc(staffUsers.staffReference));
  return { context, staff: rows.map((row) => ({ ...row, roleLabel: staffRoleLabels[row.role] })) };
}

async function getWorkspaceBase(clerkUserId: string, claimReference: string) {
  await requirePermission(clerkUserId, "CLAIMS_VIEW");
  const db = getDb();
  return (await db.select({ claim: claims, client: clientProfiles, assessment: eligibilityAssessments }).from(claims).innerJoin(clientProfiles, eq(clientProfiles.id, claims.clientProfileId)).leftJoin(eligibilityAssessments, eq(eligibilityAssessments.id, claims.eligibilityAssessmentId)).where(eq(claims.claimReference, claimReference)).limit(1))[0];
}

function safeAssessment(assessment: typeof import("@/lib/db/schema/eligibility").eligibilityAssessments.$inferSelect | null) {
  if (!assessment) return null;
  const answers = assessment.answers && typeof assessment.answers === "object" && !Array.isArray(assessment.answers) ? assessment.answers as Record<string, unknown> : {};
  return { status: assessment.status, preliminaryOutcome: assessment.preliminaryOutcome, assessedAt: iso(assessment.completedAt ?? assessment.updatedAt), answers: Object.entries(answers).slice(0, 40).map(([key, value]) => ({ key: key.replaceAll("_", " "), value: Array.isArray(value) ? value.join(", ") : String(value) })) };
}

export async function getAdminClaimWorkspace(clerkUserId: string, claimReference: string) {
  const base = await getWorkspaceBase(clerkUserId, claimReference);
  if (!base) return undefined;
  const db = getDb();
  const context = await requirePermission(clerkUserId, "CLAIMS_VIEW");
  const [assignmentRows, timeline, statusHistory, evidenceRequirements, documents, conversation, messageEntries, notificationSummary, actions] = await Promise.all([
    db.select({ id: claimAssignments.id, staffReference: staffUsers.staffReference, displayName: staffUsers.displayName, role: staffUsers.role, assignedAt: claimAssignments.assignedAt, unassignedAt: claimAssignments.unassignedAt }).from(claimAssignments).innerJoin(staffUsers, eq(staffUsers.id, claimAssignments.staffUserId)).where(eq(claimAssignments.claimId, base.claim.id)).orderBy(desc(claimAssignments.assignedAt)),
    db.select().from(claimTimelineEvents).where(and(eq(claimTimelineEvents.claimId, base.claim.id), eq(claimTimelineEvents.visibility, "CLIENT"))).orderBy(asc(claimTimelineEvents.occurredAt)),
    db.select().from(claimStatusHistory).where(eq(claimStatusHistory.claimId, base.claim.id)).orderBy(asc(claimStatusHistory.createdAt)),
    db.select({ requirementReference: claimEvidenceRequirements.requirementReference, type: claimEvidenceRequirements.type, title: claimEvidenceRequirements.title, description: claimEvidenceRequirements.description, status: claimEvidenceRequirements.status, priority: claimEvidenceRequirements.priority, required: claimEvidenceRequirements.required, clientVisible: claimEvidenceRequirements.clientVisible, dueAt: claimEvidenceRequirements.dueAt, createdAt: claimEvidenceRequirements.createdAt, documentCount: count(claimDocuments.id) }).from(claimEvidenceRequirements).leftJoin(claimDocuments, eq(claimDocuments.evidenceRequirementId, claimEvidenceRequirements.id)).where(eq(claimEvidenceRequirements.claimId, base.claim.id)).groupBy(claimEvidenceRequirements.id).orderBy(asc(claimEvidenceRequirements.createdAt)),
    context.permissions.includes("DOCUMENTS_VIEW") ? db.select({ documentReference: claimDocuments.documentReference, displayName: claimDocuments.displayName, category: claimDocuments.category, securityStatus: claimDocuments.securityStatus, status: claimDocuments.status, uploadedAt: claimDocuments.uploadedAt, createdAt: claimDocuments.createdAt }).from(claimDocuments).where(eq(claimDocuments.claimId, base.claim.id)).orderBy(asc(claimDocuments.createdAt)) : Promise.resolve([]),
    context.permissions.includes("MESSAGES_VIEW") ? db.select({ status: claimConversations.status, messageCount: count(claimMessages.id), latestMessageAt: sql<Date | null>`max(${claimMessages.createdAt})` }).from(claimConversations).leftJoin(claimMessages, and(eq(claimMessages.conversationId, claimConversations.id), eq(claimMessages.clientVisible, true))).where(eq(claimConversations.claimId, base.claim.id)).groupBy(claimConversations.id) : Promise.resolve([]),
    context.permissions.includes("MESSAGES_VIEW") ? db.select({ senderType: claimMessages.senderType, body: claimMessages.body, createdAt: claimMessages.createdAt }).from(claimMessages).innerJoin(claimConversations, eq(claimConversations.id, claimMessages.conversationId)).where(and(eq(claimConversations.claimId, base.claim.id), eq(claimMessages.clientVisible, true))).orderBy(desc(claimMessages.createdAt), desc(claimMessages.id)).limit(50) : Promise.resolve([]),
    db.select({ unreadCount: count() }).from(clientNotifications).where(and(eq(clientNotifications.claimId, base.claim.id), isNull(clientNotifications.readAt), isNull(clientNotifications.archivedAt))),
    db.select({ actionReference: claimActionRequirements.actionReference, type: claimActionRequirements.type, title: claimActionRequirements.title, description: claimActionRequirements.description, status: claimActionRequirements.status, priority: claimActionRequirements.priority, dueAt: claimActionRequirements.dueAt, createdAt: claimActionRequirements.createdAt, completedAt: claimActionRequirements.completedAt, cancelledAt: claimActionRequirements.cancelledAt }).from(claimActionRequirements).where(eq(claimActionRequirements.claimId, base.claim.id)).orderBy(asc(claimActionRequirements.createdAt)),
  ]);
  const notes = context.permissions.includes("CLAIMS_MANAGE") ? await db.select({ noteReference: claimInternalNotes.noteReference, body: claimInternalNotes.body, createdAt: claimInternalNotes.createdAt, authorReference: staffUsers.staffReference, authorName: staffUsers.displayName }).from(claimInternalNotes).innerJoin(staffUsers, eq(staffUsers.id, claimInternalNotes.authorStaffUserId)).where(eq(claimInternalNotes.claimId, base.claim.id)).orderBy(asc(claimInternalNotes.createdAt)) : [];
  const statusConfig = claimStatusConfig[base.claim.status];
  const evidence = (await getEvidenceSummaries([base.claim.id])).get(base.claim.id) ?? deriveEvidenceSummary([]);
  const currentAssignment = assignmentRows.find((assignment) => !assignment.unassignedAt);
  return { claim: { claimReference: base.claim.claimReference, status: base.claim.status, statusLabel: statusConfig.label, stage: statusConfig.stage, stageLabel: getClaimStageLabel(statusConfig.stage), priority: base.claim.operationalPriority, priorityLabel: operationalPriorityLabels[base.claim.operationalPriority], waitingOn: getClaimWaitingOn(base.claim.status), waitingOnLabel: claimWaitingOnLabels[getClaimWaitingOn(base.claim.status)], createdAt: base.claim.createdAt.toISOString(), submittedAt: iso(base.claim.submittedAt), updatedAt: base.claim.updatedAt.toISOString(), allowedTransitions: isTerminalClaimStatus(base.claim.status) ? [] : claimStatuses.filter((candidate) => canTransitionClaimStatus(base.claim.status, candidate)) }, client: { name: `${base.client.firstName} ${base.client.lastName}`.trim(), profileStatus: base.client.onboardingStatus, createdAt: base.client.createdAt.toISOString(), updatedAt: base.client.updatedAt.toISOString() }, assessment: safeAssessment(base.assessment), assignment: currentAssignment ? { staffReference: currentAssignment.staffReference, displayName: currentAssignment.displayName, role: staffRoleLabels[currentAssignment.role] } : null, assignmentHistory: assignmentRows.map((item) => ({ staffReference: item.staffReference, displayName: item.displayName, role: staffRoleLabels[item.role], assignedAt: item.assignedAt.toISOString(), unassignedAt: iso(item.unassignedAt) })), timeline: timeline.map((item) => ({ title: item.title, description: item.description, occurredAt: item.occurredAt.toISOString() })), statusHistory: statusHistory.map((item) => ({ from: item.fromStatus ? claimStatusConfig[item.fromStatus].label : null, to: claimStatusConfig[item.toStatus].label, actorType: item.actorType, createdAt: item.createdAt.toISOString() })), evidence: { summary: evidence, requirements: context.permissions.includes("EVIDENCE_VIEW") ? evidenceRequirements.map((item) => ({ requirementReference: item.requirementReference, type: item.type, title: item.title, description: item.description, status: item.status, priority: item.priority, required: item.required, clientVisible: item.clientVisible, dueAt: iso(item.dueAt), documentCount: Number(item.documentCount ?? 0) })) : [] }, documents: documents.map((item) => ({ documentReference: item.documentReference, displayName: item.displayName, category: item.category, securityStatus: item.securityStatus, status: item.status, uploadedAt: iso(item.uploadedAt), createdAt: item.createdAt.toISOString() })), messages: conversation.map((item) => ({ status: item.status, messageCount: Number(item.messageCount), latestMessageAt: iso(item.latestMessageAt) })), messageEntries: messageEntries.map((item) => ({ sender: messageSenderLabels[item.senderType], body: item.body, createdAt: item.createdAt.toISOString() })), actions: actions.map((item) => ({ actionReference: item.actionReference, type: item.type, title: item.title, description: item.description, status: item.status, priority: item.priority, dueAt: iso(item.dueAt), createdAt: item.createdAt.toISOString(), completedAt: iso(item.completedAt), cancelledAt: iso(item.cancelledAt) })), notificationUnreadCount: Number(notificationSummary[0]?.unreadCount ?? 0), notes: notes.map((item) => ({ noteReference: item.noteReference, body: item.body, createdAt: item.createdAt.toISOString(), authorReference: item.authorReference, authorName: item.authorName })), documentReviewAvailable: isDocumentReviewAvailable(), permissions: context.permissions };
}

export async function getAdminClaimClient(clerkUserId: string, claimReference: string) {
  await requirePermission(clerkUserId, "CLIENTS_VIEW");
  const base = await getWorkspaceBase(clerkUserId, claimReference);
  if (!base) return undefined;
  return { name: `${base.client.firstName} ${base.client.lastName}`.trim(), firstName: base.client.firstName, lastName: base.client.lastName, phone: base.client.phone, preferredContactMethod: base.client.preferredContactMethod, onboardingStatus: base.client.onboardingStatus, createdAt: base.client.createdAt.toISOString(), updatedAt: base.client.updatedAt.toISOString() };
}

export async function getAdminClaimAudit(clerkUserId: string, claimReference: string) {
  await requirePermission(clerkUserId, "AUDIT_VIEW");
  return getStaffAuditEventsForViewer(undefined, 100, claimReference);
}

export const adminQueueFilterOptions = { priorities: operationalPriorityLabels, assignments: claimAssignmentFilters, sorts: claimQueueSorts, waitingOn: claimWaitingOnLabels, statuses: claimStatuses, stages: claimStageConfig, evidence: ["yes", "no"] as const };
