import "server-only";

import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";

import { claimStatusConfig, type ClaimStatus } from "@/config/claim-statuses";
import { clientActionConfig } from "@/config/client-actions";
import { getClaimNextStepForClient, getClaimWaitingOn, claimWaitingOnLabels } from "@/config/claim-tracking";
import { resolveNotificationAction } from "@/config/notifications";
import { getClientProfileByClerkId } from "@/lib/clients/repository";
import { getDb } from "@/lib/db";
import { claims, claimTimelineEvents } from "@/lib/db/schema/claims";
import { eligibilityAssessments } from "@/lib/db/schema/eligibility";
import { claimDocuments, claimEvidenceRequirements } from "@/lib/db/schema/evidence";
import { claimActionRequirements } from "@/lib/db/schema/actions";
import { claimConversations, claimMessageReads, claimMessages } from "@/lib/db/schema/messaging";
import { clientNotifications } from "@/lib/db/schema/notifications";
import { deriveEvidenceSummary, type EvidenceSummary } from "@/lib/evidence/summary";
import { getUnreadNotificationCount } from "@/lib/notifications/repository";
import { isDashboardActiveClaim, mergeDashboardActivity, resolvePrimaryDashboardAction, type DashboardActivity, type DashboardAttentionItem } from "./priority";

export type DashboardClaim = {
  claimReference: string;
  archivedAt: string | null;
  status: ClaimStatus;
  statusLabel: string;
  stageLabel: string;
  stageOrder: number;
  stageCount: number;
  waitingOn: string;
  nextStep: ReturnType<typeof getClaimNextStepForClient>;
  createdAt: string;
  submittedAt: string | null;
  latestActivityAt: string | null;
  evidence: Omit<EvidenceSummary, "outstandingRequirements"> & { outstandingRequirements: Array<{ title: string; status: string }> };
  unreadMessageCount: number;
  openActions: Array<{ actionReference: string; title: string; description: string; priority: "NORMAL" | "IMPORTANT"; dueAt: string | null; clientCanComplete: boolean }>;
};

export type DashboardViewModel = {
  client: { firstName: string | null } | null;
  assessment: { state: "NONE" | "INCOMPLETE" | "COMPLETE"; updatedAt: string | null };
  claims: DashboardClaim[];
  activeClaims: DashboardClaim[];
  terminalClaimCount: number;
  attentionItems: DashboardAttentionItem[];
  primaryAction: ReturnType<typeof resolvePrimaryDashboardAction>;
  summaries: {
    activeClaims: number;
    actionsRequired: number;
    unreadMessages: number;
    unreadNotifications: number;
    outstandingEvidence: number;
  };
  messages: { unreadCount: number; latestIncoming: { body: string; claimReference: string; createdAt: string } | null };
  notifications: { unreadCount: number; actionRequiredCount: number; latestImportant: { title: string; claimReference: string | null; createdAt: string } | null };
  recentActivity: DashboardActivity[];
};

function iso(date: Date | null | undefined) { return date?.toISOString() ?? null; }

export async function getClientDashboard(clerkUserId: string): Promise<DashboardViewModel> {
  const profile = await getClientProfileByClerkId(clerkUserId);
  if (!profile) return emptyDashboard();
  const db = getDb();
  const [claimRows, assessment, notificationUnreadCount] = await Promise.all([
    db.select({ id: claims.id, clientProfileId: claims.clientProfileId, eligibilityAssessmentId: claims.eligibilityAssessmentId, claimReference: claims.claimReference, status: claims.status, archivedAt: claims.archivedAt, createdAt: claims.createdAt, updatedAt: claims.updatedAt, submittedAt: claims.submittedAt, closedAt: claims.closedAt }).from(claims).where(eq(claims.clientProfileId, profile.id)).orderBy(desc(claims.createdAt)),
    db.select({ status: eligibilityAssessments.status, updatedAt: eligibilityAssessments.updatedAt }).from(eligibilityAssessments).where(eq(eligibilityAssessments.clientProfileId, profile.id)).orderBy(desc(eligibilityAssessments.createdAt)).limit(1),
    getUnreadNotificationCount(clerkUserId),
  ]);
  const claimIds = claimRows.map((claim) => claim.id);
  const [requirements, documents, conversations, timelines, recentNotifications, actions] = await Promise.all([
    claimIds.length ? db.select({ id: claimEvidenceRequirements.id, claimId: claimEvidenceRequirements.claimId, title: claimEvidenceRequirements.title, status: claimEvidenceRequirements.status, required: claimEvidenceRequirements.required, clientVisible: claimEvidenceRequirements.clientVisible }).from(claimEvidenceRequirements).where(and(inArray(claimEvidenceRequirements.claimId, claimIds), eq(claimEvidenceRequirements.clientVisible, true))).orderBy(asc(claimEvidenceRequirements.createdAt)) : Promise.resolve([]),
    claimIds.length ? db.select({ claimId: claimDocuments.claimId, evidenceRequirementId: claimDocuments.evidenceRequirementId }).from(claimDocuments).where(inArray(claimDocuments.claimId, claimIds)) : Promise.resolve([]),
    claimIds.length ? db.select({ id: claimConversations.id, claimId: claimConversations.claimId }).from(claimConversations).where(inArray(claimConversations.claimId, claimIds)) : Promise.resolve([]),
    claimIds.length ? db.select({ claimId: claimTimelineEvents.claimId, title: claimTimelineEvents.title, description: claimTimelineEvents.description, occurredAt: claimTimelineEvents.occurredAt }).from(claimTimelineEvents).where(and(inArray(claimTimelineEvents.claimId, claimIds), eq(claimTimelineEvents.visibility, "CLIENT"))).orderBy(desc(claimTimelineEvents.occurredAt)).limit(40) : Promise.resolve([]),
    db.select({ title: clientNotifications.title, body: clientNotifications.body, claimId: clientNotifications.claimId, actionReference: clientNotifications.actionReference, actionType: clientNotifications.actionType, category: clientNotifications.category, createdAt: clientNotifications.createdAt, priority: clientNotifications.priority, readAt: clientNotifications.readAt }).from(clientNotifications).where(and(eq(clientNotifications.clientProfileId, profile.id), isNull(clientNotifications.archivedAt))).orderBy(desc(clientNotifications.createdAt), desc(clientNotifications.id)).limit(20),
    claimIds.length ? db.select({ claimId: claimActionRequirements.claimId, actionReference: claimActionRequirements.actionReference, type: claimActionRequirements.type, title: claimActionRequirements.title, description: claimActionRequirements.description, priority: claimActionRequirements.priority, dueAt: claimActionRequirements.dueAt }).from(claimActionRequirements).where(and(inArray(claimActionRequirements.claimId, claimIds), eq(claimActionRequirements.clientVisible, true), eq(claimActionRequirements.status, "OPEN"))).orderBy(asc(claimActionRequirements.createdAt)) : Promise.resolve([]),
  ]);
  const conversationIds = conversations.map((conversation) => conversation.id);
  const [messageRows, readRows, notificationActionCountResult] = await Promise.all([
    conversationIds.length ? db.select({ conversationId: claimMessages.conversationId, id: claimMessages.id, senderType: claimMessages.senderType, body: claimMessages.body, createdAt: claimMessages.createdAt }).from(claimMessages).where(and(inArray(claimMessages.conversationId, conversationIds), eq(claimMessages.clientVisible, true))).orderBy(desc(claimMessages.createdAt), desc(claimMessages.id)) : Promise.resolve([]),
    conversationIds.length ? db.select({ conversationId: claimMessageReads.conversationId, lastReadAt: claimMessageReads.lastReadAt, lastReadMessageId: claimMessageReads.lastReadMessageId }).from(claimMessageReads).where(and(inArray(claimMessageReads.conversationId, conversationIds), eq(claimMessageReads.viewerType, "CLIENT"), eq(claimMessageReads.viewerId, profile.id))) : Promise.resolve([]),
    db.select({ count: count() }).from(clientNotifications).where(and(eq(clientNotifications.clientProfileId, profile.id), isNull(clientNotifications.readAt), isNull(clientNotifications.archivedAt), eq(clientNotifications.priority, "ACTION_REQUIRED"))),
  ]);
  const claimReferenceById = new Map(claimRows.map((claim) => [claim.id, claim.claimReference]));
  const docsByRequirement = new Map<string, number>();
  for (const document of documents) if (document.evidenceRequirementId) docsByRequirement.set(document.evidenceRequirementId, (docsByRequirement.get(document.evidenceRequirementId) ?? 0) + 1);
  const requirementsByClaim = new Map<string, typeof requirements>();
  for (const requirement of requirements) requirementsByClaim.set(requirement.claimId, [...(requirementsByClaim.get(requirement.claimId) ?? []), requirement]);
  const actionsByClaim = new Map<string, typeof actions>();
  for (const action of actions) actionsByClaim.set(action.claimId, [...(actionsByClaim.get(action.claimId) ?? []), action]);
  const messagesByConversation = new Map<string, typeof messageRows>();
  for (const message of messageRows) messagesByConversation.set(message.conversationId, [...(messagesByConversation.get(message.conversationId) ?? []), message]);
  const readsByConversation = new Map(readRows.map((read) => [read.conversationId, read]));
  const evidenceByClaim = new Map<string, DashboardClaim["evidence"]>();
  for (const claim of claimRows) {
    const claimRequirements = requirementsByClaim.get(claim.id) ?? [];
    const summary = deriveEvidenceSummary(claimRequirements.map((requirement) => ({ status: requirement.status, required: requirement.required, documentCount: docsByRequirement.get(requirement.id) ?? 0 })));
    evidenceByClaim.set(claim.id, { ...summary, outstandingRequirements: claimRequirements.filter((requirement) => summary.outstandingRequirements.some((item) => item.status === requirement.status && item.required === requirement.required)).map((requirement) => ({ title: requirement.title, status: requirement.status })) });
  }
  const unreadByClaim = new Map<string, number>();
  let latestIncoming: DashboardViewModel["messages"]["latestIncoming"] = null;
  for (const conversation of conversations) {
    const read = readsByConversation.get(conversation.id);
    const incoming = (messagesByConversation.get(conversation.id) ?? []).filter((message) => message.senderType === "CLAIMS_BRIDGE" || message.senderType === "SYSTEM");
    const unread = incoming.filter((message) => !read || message.createdAt > read.lastReadAt || (message.createdAt.getTime() === read.lastReadAt.getTime() && (!read.lastReadMessageId || message.id > read.lastReadMessageId))).length;
    unreadByClaim.set(conversation.claimId, unread);
    const latest = incoming[0];
    const claimReference = claimReferenceById.get(conversation.claimId);
    if (latest && claimReference && (!latestIncoming || latest.createdAt > new Date(latestIncoming.createdAt))) latestIncoming = { body: latest.body.slice(0, 160), claimReference, createdAt: latest.createdAt.toISOString() };
  }
  const timelineByClaim = new Map<string, typeof timelines>();
  for (const event of timelines) timelineByClaim.set(event.claimId, [...(timelineByClaim.get(event.claimId) ?? []), event]);
  const stageCount = 7;
  const dashboardClaims: DashboardClaim[] = claimRows.map((claim) => {
    const status = claim.status as ClaimStatus;
    const statusConfig = claimStatusConfig[status];
    const claimTimeline = timelineByClaim.get(claim.id) ?? [];
    return { claimReference: claim.claimReference, archivedAt: iso(claim.archivedAt), status, statusLabel: statusConfig.label, stageLabel: statusConfig.stage === "PROGRESS_RESOLUTION" ? "Progress / resolution" : statusConfig.stage === "INITIAL_REVIEW" ? "Initial review" : statusConfig.stage.charAt(0) + statusConfig.stage.slice(1).toLowerCase(), stageOrder: statusConfig.stage === "CLOSED" ? 7 : ({ SUBMITTED: 1, INITIAL_REVIEW: 2, EVIDENCE: 3, ASSESSMENT: 4, PREPARATION: 5, PROGRESS_RESOLUTION: 6 } as Record<string, number>)[statusConfig.stage], stageCount, waitingOn: claimWaitingOnLabels[getClaimWaitingOn(status)], nextStep: getClaimNextStepForClient(status, Boolean(evidenceByClaim.get(claim.id)?.actionRequiredCount)), createdAt: claim.createdAt.toISOString(), submittedAt: iso(claim.submittedAt), latestActivityAt: claimTimeline[0] ? claimTimeline[0].occurredAt.toISOString() : claim.createdAt.toISOString(), evidence: evidenceByClaim.get(claim.id) ?? { requestedCount: 0, providedCount: 0, acceptedCount: 0, underReviewCount: 0, actionRequiredCount: 0, completenessState: "NOT_STARTED", outstandingRequirements: [] }, unreadMessageCount: unreadByClaim.get(claim.id) ?? 0, openActions: (actionsByClaim.get(claim.id) ?? []).map((action) => ({ actionReference: action.actionReference, title: action.title, description: action.description, priority: action.priority, dueAt: iso(action.dueAt), clientCanComplete: clientActionConfig[action.type].clientCanComplete })) };
  });
  const activeClaims = dashboardClaims.filter((claim) => !claim.archivedAt && isDashboardActiveClaim(claim.status));
  const attentionItems: DashboardAttentionItem[] = [];
  for (const claim of activeClaims) {
    if (claim.evidence.actionRequiredCount > 0) attentionItems.push({ kind: "PROVIDE_EVIDENCE", priority: 1, label: "Review requested evidence", description: "Check the evidence requests that may need information or action from you.", destination: `/account/claims/${encodeURIComponent(claim.claimReference)}/evidence`, claimReference: claim.claimReference, title: `${claim.evidence.actionRequiredCount} evidence item${claim.evidence.actionRequiredCount === 1 ? "" : "s"} may need attention`, context: claim.claimReference });
    for (const action of claim.openActions) attentionItems.push({ kind: "CLIENT_ACTION", priority: action.priority === "IMPORTANT" ? 2 : 2, label: action.title, description: action.description, destination: `/account/claims/${encodeURIComponent(claim.claimReference)}#client-actions`, claimReference: claim.claimReference, title: action.title, context: claim.claimReference });
    if (claim.unreadMessageCount > 0) attentionItems.push({ kind: "READ_MESSAGE", priority: 3, label: "Read secure messages", description: "Review unread correspondence connected to this claim.", destination: `/account/claims/${encodeURIComponent(claim.claimReference)}/messages`, claimReference: claim.claimReference, title: `${claim.unreadMessageCount} unread message${claim.unreadMessageCount === 1 ? "" : "s"}`, context: claim.claimReference });
    if (claim.status === "AWAITING_CLIENT" && claim.evidence.actionRequiredCount === 0) attentionItems.push({ kind: "REVIEW_CLAIM", priority: 5, label: "Review your claim", description: "Your claim is waiting for information or action from you.", destination: `/account/claims/${encodeURIComponent(claim.claimReference)}`, claimReference: claim.claimReference, title: "Your claim may need an action", context: claim.claimReference });
  }
  const notificationRows = recentNotifications.map((notification) => ({ ...notification, claimReference: notification.claimId ? claimReferenceById.get(notification.claimId) ?? null : null, actionHref: resolveNotificationAction(notification.actionType, notification.actionReference) }));
  const claimsWithEvidenceAttention = new Set(activeClaims.filter((claim) => claim.evidence.actionRequiredCount > 0).map((claim) => claim.claimReference));
  const claimsWithClientAction = new Set(activeClaims.filter((claim) => claim.openActions.length > 0).map((claim) => claim.claimReference));
  const claimsWithUnreadMessages = new Set(activeClaims.filter((claim) => claim.unreadMessageCount > 0).map((claim) => claim.claimReference));
  for (const notification of notificationRows.filter((item) => !item.readAt && (item.priority === "ACTION_REQUIRED" || (item.priority === "IMPORTANT" && item.category !== "MESSAGES")))) {
    if (notification.claimReference && (notification.priority === "ACTION_REQUIRED" ? !claimsWithEvidenceAttention.has(notification.claimReference) && !claimsWithClientAction.has(notification.claimReference) : !claimsWithUnreadMessages.has(notification.claimReference))) attentionItems.push({ kind: "VIEW_NOTIFICATION", priority: notification.priority === "ACTION_REQUIRED" ? 2 : 4, label: "Review notification", description: notification.body, destination: notification.actionHref ?? "/account/notifications", claimReference: notification.claimReference, title: notification.title, context: notification.claimReference });
  }
  const assessmentRow = assessment[0];
  const assessmentState = !assessmentRow ? "NONE" : assessmentRow.status === "COMPLETE" ? "COMPLETE" : "INCOMPLETE";
  const relevantClaim = activeClaims.find((claim) => attentionItems.some((item) => item.claimReference === claim.claimReference)) ?? activeClaims[0];
  const primaryAction = resolvePrimaryDashboardAction({ attentionItems, hasActiveClaim: activeClaims.length > 0, hasAnyClaim: dashboardClaims.length > 0, mostRelevantClaimReference: relevantClaim?.claimReference, assessmentState });
  const recentImportant = notificationRows.find((notification) => notification.priority === "IMPORTANT") ?? null;
  const timelineActivity = timelines.map((event) => ({ title: event.title, description: event.description, claimReference: claimReferenceById.get(event.claimId) ?? "", occurredAt: event.occurredAt })).filter((event) => event.claimReference);
  const recentActivity = mergeDashboardActivity({ timeline: timelineActivity, notifications: notificationRows.map((notification) => ({ title: notification.title, body: notification.body, claimReference: notification.claimReference, createdAt: notification.createdAt, actionHref: notification.actionHref })) });
  return { client: { firstName: profile.firstName }, assessment: { state: assessmentState, updatedAt: iso(assessmentRow?.updatedAt) }, claims: dashboardClaims, activeClaims, terminalClaimCount: dashboardClaims.length - activeClaims.length, attentionItems: attentionItems.sort((a, b) => a.priority - b.priority).slice(0, 6), primaryAction, summaries: { activeClaims: activeClaims.length, actionsRequired: attentionItems.filter((item) => item.priority <= 2 || item.kind === "REVIEW_CLAIM").length, unreadMessages: [...unreadByClaim.values()].reduce((sum, value) => sum + value, 0), unreadNotifications: notificationUnreadCount, outstandingEvidence: activeClaims.reduce((sum, claim) => sum + claim.evidence.outstandingRequirements.length, 0) }, messages: { unreadCount: [...unreadByClaim.values()].reduce((sum, value) => sum + value, 0), latestIncoming }, notifications: { unreadCount: notificationUnreadCount, actionRequiredCount: Number(notificationActionCountResult[0]?.count ?? 0), latestImportant: recentImportant ? { title: recentImportant.title, claimReference: recentImportant.claimReference, createdAt: recentImportant.createdAt.toISOString() } : null }, recentActivity };
}

function emptyDashboard(): DashboardViewModel {
  const primaryAction = resolvePrimaryDashboardAction({ attentionItems: [], hasActiveClaim: false, hasAnyClaim: false, assessmentState: "NONE" });
  return { client: null, assessment: { state: "NONE", updatedAt: null }, claims: [], activeClaims: [], terminalClaimCount: 0, attentionItems: [], primaryAction, summaries: { activeClaims: 0, actionsRequired: 0, unreadMessages: 0, unreadNotifications: 0, outstandingEvidence: 0 }, messages: { unreadCount: 0, latestIncoming: null }, notifications: { unreadCount: 0, actionRequiredCount: 0, latestImportant: null }, recentActivity: [] };
}
