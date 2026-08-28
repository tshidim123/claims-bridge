import type { ClaimStatus } from "@/config/claim-statuses";

export type DashboardActivity = {
  title: string;
  description: string;
  claimReference: string | null;
  occurredAt: string;
  destination: string | null;
};

export type DashboardActionKind = "PROVIDE_EVIDENCE" | "CLIENT_ACTION" | "READ_MESSAGE" | "VIEW_NOTIFICATION" | "REVIEW_CLAIM" | "START_CLAIM" | "CONTINUE_ASSESSMENT" | "CHECK_ELIGIBILITY" | "NO_ACTION";

export type DashboardAction = {
  kind: DashboardActionKind;
  label: string;
  description: string;
  destination: string | null;
  claimReference?: string;
};

export type DashboardAttentionItem = DashboardAction & {
  priority: number;
  title: string;
  context: string;
};

export type DashboardPriorityInput = {
  attentionItems: DashboardAttentionItem[];
  hasActiveClaim: boolean;
  hasAnyClaim: boolean;
  mostRelevantClaimReference?: string;
  assessmentState: "NONE" | "INCOMPLETE" | "COMPLETE";
};

export function resolvePrimaryDashboardAction(input: DashboardPriorityInput): DashboardAction {
  const first = [...input.attentionItems].sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))[0];
  if (first) return first;
  if (input.assessmentState === "INCOMPLETE") return { kind: "CONTINUE_ASSESSMENT", label: "Continue your assessment", description: "Return to your saved assessment when you are ready to continue.", destination: "/account/assessment" };
  if (input.assessmentState === "COMPLETE" && !input.hasActiveClaim && !input.hasAnyClaim) return { kind: "START_CLAIM", label: "Review your assessment", description: "Review the preliminary assessment and choose whether to continue to claim review.", destination: "/account/assessment" };
  if (!input.hasActiveClaim && input.assessmentState === "NONE") return { kind: "CHECK_ELIGIBILITY", label: "Check eligibility", description: "Start with a preliminary eligibility assessment.", destination: "/check-eligibility" };
  if (input.hasActiveClaim && input.mostRelevantClaimReference) return { kind: "REVIEW_CLAIM", label: "Continue your claim", description: "Open the most relevant claim workspace for the current workflow state.", destination: `/account/claims/${encodeURIComponent(input.mostRelevantClaimReference)}`, claimReference: input.mostRelevantClaimReference };
  if (input.hasAnyClaim) return { kind: "REVIEW_CLAIM", label: "View your claim history", description: "Open My Claims to review your existing claim records.", destination: "/account/claims" };
  return { kind: "NO_ACTION", label: "No action currently required", description: "There is nothing you need to do right now.", destination: null };
}

export function isDashboardActiveClaim(status: ClaimStatus) {
  return !["COMPLETED", "CLOSED", "NOT_ELIGIBLE"].includes(status);
}

function addActivityDeduplicated(items: DashboardActivity[], candidate: DashboardActivity) {
  const duplicate = items.some((item) => item.claimReference === candidate.claimReference && Math.abs(new Date(item.occurredAt).getTime() - new Date(candidate.occurredAt).getTime()) <= 60_000);
  if (!duplicate) items.push(candidate);
}

export function mergeDashboardActivity(input: { timeline: Array<{ title: string; description: string; claimReference: string; occurredAt: Date }>; notifications: Array<{ title: string; body: string; claimReference: string | null; createdAt: Date; actionHref: string | null }> }) {
  const activity: DashboardActivity[] = [];
  for (const event of input.timeline) addActivityDeduplicated(activity, { title: event.title, description: event.description, claimReference: event.claimReference, occurredAt: event.occurredAt.toISOString(), destination: `/account/claims/${encodeURIComponent(event.claimReference)}/timeline` });
  for (const notification of input.notifications) addActivityDeduplicated(activity, { title: notification.title, description: notification.body, claimReference: notification.claimReference, occurredAt: notification.createdAt.toISOString(), destination: notification.actionHref });
  return activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 8);
}
