import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import path from "node:path";

import { CLAIM_REFERENCE_PATTERN, generateClaimReference } from "../src/lib/claims/reference";
import { canTransitionClaimStatus, claimStageConfig, claimStatusConfig, claimStatuses, isTerminalClaimStatus } from "../src/config/claim-statuses";
import { claimNextStepConfig, claimTimelineEventLabels, getClaimWaitingOn, getPreliminaryOutcomeLabel, transitionTimelineConfig } from "../src/config/claim-tracking";
import { canTransitionDocumentStatus, canTransitionEvidenceRequirement, documentCategoryConfig, documentStatusLabels, documentStatuses, evidenceCompletenessStateConfig, evidenceRequirementConfig, evidenceRequirementPriorities, evidenceRequirementStatuses, evidenceRequirementTransitions, evidenceRequirementTypes, isEvidenceRequirementStatus, isEvidenceRequirementType } from "../src/config/evidence";
import { deriveEvidenceSummary } from "../src/lib/evidence/summary";
import { DOCUMENT_MAX_SIZE_BYTES, DOWNLOAD_URL_EXPIRY_SECONDS, UPLOAD_URL_EXPIRY_SECONDS, isSupportedDocumentMimeType } from "../src/config/evidence";
import { createOpaqueDocumentReference, createOpaqueStorageKey } from "../src/lib/documents/keys";
import { createEvidenceRequirementReference, EVIDENCE_REQUIREMENT_REFERENCE_PATTERN } from "../src/lib/evidence/keys";
import { detectDocumentMimeType, DocumentValidationError, sanitizeFilename, validateUploadRequest } from "../src/lib/documents/validation";
import { MAX_MESSAGE_LENGTH, messageBodySchema, messageSenderLabels } from "../src/config/messaging";
import { canDisableNotificationCategory, claimStatusNotificationTypes, notificationDefinitions, notificationPreferenceConfig, notificationTypes, resolveNotificationAction } from "../src/config/notifications";
import { isDashboardActiveClaim, resolvePrimaryDashboardAction } from "../src/lib/dashboard/priority";
import { mergeDashboardActivity } from "../src/lib/dashboard/priority";
import { createPublicMetadata, publicCtas, publicRoutePaths, publicScope, makeBreadcrumbs } from "../src/config/public-site";
import { publicNavigation } from "../src/config/navigation";
import { editorialClusters } from "../src/config/knowledge-hub";
import { hasPermissionForRole, isStaffRole, rolePermissions, staffPermissions, staffRoles } from "../src/config/staff";
import { STAFF_REFERENCE_PATTERN, createStaffReference } from "../src/lib/staff/reference";
import { claimAssignmentFilters, operationalPriorities, isOperationalPriority, internalNoteMaxLength } from "../src/config/admin-claims";
import { NOTE_REFERENCE_PATTERN, createInternalNoteReference } from "../src/lib/admin/claims/references";
import { futureResults, futureTestimonials, optionalBusinessDetails, publicDisclosures, verifiedTrustFacts } from "../src/config/public-trust";
import { getPublicSitemapPaths } from "../src/app/sitemap";
import { knowledgeArticles, knowledgeCategories, knowledgeTopics } from "../src/content/knowledge-hub";
import { calculateReadingTime, getArticleBreadcrumbs, getArticleBySlug, getArticleBySlugIncludingUnpublished, getArticleHeadingIds, getArticleStructuredData, getArticleToc, getArticlesByCategory, getClusterArticles, getEditorialAudit, getFreshnessState, getKnowledgeHubStaticParams, getPublishedArticles, getRelatedArticles, searchKnowledgeArticles } from "../src/lib/knowledge-hub";
import { clientActionConfig, clientActionStatuses, clientActionTypes } from "../src/config/client-actions";
import { CLIENT_ACTION_REFERENCE_PATTERN, createClientActionReference } from "../src/lib/actions/keys";
import { CLIENT_REFERENCE_PATTERN, createClientReference } from "../src/lib/clients/reference";
import { ASSESSMENT_REFERENCE_PATTERN, createAssessmentReference } from "../src/lib/eligibility/persistence/reference";
import { createLeadReference, LEAD_REFERENCE_PATTERN } from "../src/lib/leads/reference";
import { leadCaptureSchema } from "../src/lib/leads/validation";
import { canChangeLeadStatus, isSystemDerivedLeadStatus } from "../src/lib/leads/status";
import { getReviewQuestions, pruneHiddenAnswers } from "../src/lib/eligibility/flow";
import { assessmentPayloadSchema } from "../src/lib/eligibility/persistence/validation";
import { customLocationPattern, normalizeCustomLocation, validateQuestionAnswer } from "../src/lib/eligibility/validation";
import { getQuestionById } from "../src/lib/eligibility/flow";
import { normalisePhone, profileSchema, profileShareSchema } from "../src/lib/clients/validation";
import { preAccountAssessmentCaptureSchema } from "../src/lib/leads/validation";

test("claim references use the documented secure format", () => {
  const reference = generateClaimReference(new Date("2026-08-28T00:00:00.000Z"));

  assert.match(reference, CLAIM_REFERENCE_PATTERN);
  assert.equal(reference.slice(0, 6), "CB-26-");
});

test("claim reference generation produces unique references in a small sample", () => {
  const references = new Set(Array.from({ length: 100 }, () => generateClaimReference()));

  assert.equal(references.size, 100);
});

test("claim status configuration covers every persisted status and terminal states", () => {
  for (const status of claimStatuses) {
    assert.equal(claimStatusConfig[status].id, status);
    assert.ok(claimStatusConfig[status].label);
    assert.ok(claimStatusConfig[status].stage);
  }

  assert.equal(claimStageConfig.length, 7);
  assert.equal(isTerminalClaimStatus("CLOSED"), true);
  assert.equal(isTerminalClaimStatus("SUBMITTED"), false);
});

test("claim status maps to broad stage and waiting-on guidance", () => {
  assert.equal(claimStatusConfig.EVIDENCE_REVIEW.stage, "EVIDENCE");
  assert.equal(claimStatusConfig.CLAIM_ASSESSMENT.stage, "ASSESSMENT");
  assert.equal(getClaimWaitingOn("AWAITING_CLIENT"), "CLIENT");
  assert.equal(getClaimWaitingOn("AWAITING_THIRD_PARTY"), "THIRD_PARTY");
  assert.equal(getClaimWaitingOn("COMPLETED"), "NONE");
});

test("claim transition graph permits legal movement and blocks forbidden or terminal jumps", () => {
  assert.equal(canTransitionClaimStatus("SUBMITTED", "INITIAL_REVIEW"), true);
  assert.equal(canTransitionClaimStatus("INITIAL_REVIEW", "CLAIM_ASSESSMENT"), true);
  assert.equal(canTransitionClaimStatus("SUBMITTED", "COMPLETED"), false);
  assert.equal(canTransitionClaimStatus("CLOSED", "IN_PROGRESS"), false);
});

test("tracking configuration is complete and claim details use safe presentation labels", () => {
  for (const status of claimStatuses) {
    assert.ok(claimNextStepConfig[status].title);
    assert.ok(status in transitionTimelineConfig);
  }

  assert.equal(getPreliminaryOutcomeLabel("REVIEW_RECOMMENDED"), "Review recommended");
  assert.equal(getPreliminaryOutcomeLabel("UNEXPECTED_INTERNAL_VALUE"), "Preliminary outcome recorded");
});

test("evidence type configuration is complete and does not auto-request identity", () => {
  for (const type of evidenceRequirementTypes) {
    const config = evidenceRequirementConfig[type];
    assert.equal(config.id, type);
    assert.ok(config.label);
    assert.ok(config.description);
    assert.ok(documentCategoryConfig[config.documentCategory]);
    assert.ok(config.sortOrder > 0);
  }
  assert.equal(isEvidenceRequirementType("IDENTITY_DOCUMENT"), true);
  assert.equal(isEvidenceRequirementType("UNSUPPORTED"), false);
});

test("evidence requirement transitions are controlled and terminal waivers stay terminal", () => {
  for (const status of evidenceRequirementStatuses) {
    assert.ok(status in evidenceRequirementTransitions);
    assert.equal(isEvidenceRequirementStatus(status), true);
  }
  assert.equal(canTransitionEvidenceRequirement("REQUESTED", "UPLOADED"), true);
  assert.equal(canTransitionEvidenceRequirement("UNDER_REVIEW", "MORE_INFORMATION_REQUIRED"), true);
  assert.equal(canTransitionEvidenceRequirement("REQUESTED", "ACCEPTED"), false);
  assert.equal(canTransitionEvidenceRequirement("WAIVED", "UPLOADED"), false);
});

test("evidence completeness is derived deterministically from current requirements", () => {
  assert.equal(deriveEvidenceSummary([]).completenessState, "NOT_STARTED");
  assert.equal(deriveEvidenceSummary([{ status: "REQUESTED", required: true, documentCount: 0 }]).completenessState, "ACTION_REQUIRED");
  assert.equal(deriveEvidenceSummary([{ status: "UPLOADED", required: true, documentCount: 1 }]).completenessState, "READY_FOR_REVIEW");
  assert.equal(deriveEvidenceSummary([{ status: "UNDER_REVIEW", required: true, documentCount: 1 }]).completenessState, "REVIEWING");
  assert.equal(deriveEvidenceSummary([{ status: "ACCEPTED", required: true, documentCount: 1 }]).completenessState, "COMPLETE");
  assert.equal(deriveEvidenceSummary([{ status: "WAIVED", required: true, documentCount: 0 }]).completenessState, "NOT_STARTED");
  assert.equal(evidenceCompletenessStateConfig.ACTION_REQUIRED.label, "Needs your attention");
});

test("evidence timeline labels are client-safe and configured", () => {
  assert.equal(claimTimelineEventLabels.DOCUMENT_RECEIVED, "Evidence received");
  assert.equal(claimTimelineEventLabels.DOCUMENT_ACCEPTED, "Evidence recorded");
  assert.equal(claimTimelineEventLabels.MORE_EVIDENCE_REQUIRED, "More evidence required");
});

test("document upload configuration is conservative and short-lived", () => {
  assert.equal(isSupportedDocumentMimeType("application/pdf"), true);
  assert.equal(isSupportedDocumentMimeType("text/html"), false);
  assert.equal(DOCUMENT_MAX_SIZE_BYTES, 15 * 1024 * 1024);
  assert.equal(UPLOAD_URL_EXPIRY_SECONDS, 600);
  assert.equal(DOWNLOAD_URL_EXPIRY_SECONDS, 180);
});

test("document filenames are sanitized without becoming storage keys", () => {
  const filename = sanitizeFilename("../tenant\\records\u202E.pdf");
  assert.equal(filename, ".._tenant_records.pdf");
  assert.notEqual(createOpaqueStorageKey(), createOpaqueStorageKey());
  assert.match(createOpaqueStorageKey(), /^quarantine\/[0-9a-f-]+\/[0-9a-f-]+$/);
  assert.match(createOpaqueDocumentReference(), /^[0-9a-f-]{36}$/);
});

test("server upload validation checks type, extension and size", () => {
  const valid = validateUploadRequest({ category: "TENANCY_AGREEMENT", evidenceRequirementType: "TENANCY_AGREEMENT", filename: "agreement.pdf", mimeType: "application/pdf", sizeBytes: 1024 });
  assert.equal(valid.mimeType, "application/pdf");
  assert.throws(() => validateUploadRequest({ category: "TENANCY_AGREEMENT", filename: "agreement.html", mimeType: "text/html", sizeBytes: 1024 }), (error) => error instanceof DocumentValidationError && error.code === "UNSUPPORTED_TYPE");
  assert.throws(() => validateUploadRequest({ category: "TENANCY_AGREEMENT", filename: "agreement.pdf", mimeType: "application/pdf", sizeBytes: DOCUMENT_MAX_SIZE_BYTES + 1 }), (error) => error instanceof DocumentValidationError && error.code === "FILE_TOO_LARGE");
  assert.equal(detectDocumentMimeType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])), "application/pdf");
  assert.equal(detectDocumentMimeType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(detectDocumentMimeType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(detectDocumentMimeType(new Uint8Array([0, 1, 2, 3])), null);
});

test("message validation trims valid text and rejects empty or oversized bodies", () => {
  assert.equal(messageBodySchema.parse({ body: "  A tenant update.  " }).body, "A tenant update.");
  assert.equal(messageBodySchema.parse({ body: "<b>plain text</b>" }).body, "<b>plain text</b>");
  assert.throws(() => messageBodySchema.parse({ body: "   " }));
  assert.throws(() => messageBodySchema.parse({ body: "x".repeat(MAX_MESSAGE_LENGTH + 1) }));
  assert.equal(messageSenderLabels.CLIENT, "You");
  assert.equal(messageSenderLabels.CLAIMS_BRIDGE, "Claims Bridge");
  assert.equal(messageSenderLabels.SYSTEM, "Claims Bridge update");
});

test("notification definitions cover controlled types and preserve essential categories", () => {
  for (const type of notificationTypes) {
    assert.equal(notificationDefinitions[type].id, type);
    assert.ok(notificationDefinitions[type].title);
    assert.ok(notificationDefinitions[type].body({ claimReference: "CB-26-ABCDEFGH" }));
  }
  assert.equal(notificationPreferenceConfig.ACTION_REQUIRED.essential, true);
  assert.equal(notificationPreferenceConfig.DOCUMENTS.essential, false);
  assert.equal(canDisableNotificationCategory("ACTION_REQUIRED"), false);
  assert.equal(canDisableNotificationCategory("DOCUMENTS"), true);
});

test("notification actions resolve only to controlled internal routes", () => {
  assert.equal(resolveNotificationAction("VIEW_MESSAGES", "CB-26-ABCDEFGH"), "/account/claims/CB-26-ABCDEFGH/messages");
  assert.equal(resolveNotificationAction("VIEW_EVIDENCE", "https://example.com"), null);
  assert.equal(resolveNotificationAction("ACCOUNT", null), "/account/profile");
  assert.equal(resolveNotificationAction(undefined, undefined), null);
});

test("claim notification mapping selects meaningful workflow changes", () => {
  assert.equal(claimStatusNotificationTypes.INITIAL_REVIEW, "CLAIM_PROGRESS_UPDATE");
  assert.equal(claimStatusNotificationTypes.AWAITING_CLIENT, "CLIENT_ACTION_REQUIRED");
  assert.equal(claimStatusNotificationTypes.EVIDENCE_REVIEW, undefined);
});

test("dashboard priority chooses client action before routine progress", () => {
  const action = resolvePrimaryDashboardAction({ attentionItems: [{ kind: "PROVIDE_EVIDENCE", priority: 1, label: "Review evidence", description: "Evidence needs attention.", destination: "/account/claims/CB-26-ABCDEFGH/evidence", claimReference: "CB-26-ABCDEFGH", title: "Evidence requested", context: "CB-26-ABCDEFGH" }], hasActiveClaim: true, hasAnyClaim: true, mostRelevantClaimReference: "CB-26-ABCDEFGH", assessmentState: "COMPLETE" });
  assert.equal(action.kind, "PROVIDE_EVIDENCE");
  assert.equal(resolvePrimaryDashboardAction({ attentionItems: [], hasActiveClaim: false, hasAnyClaim: false, assessmentState: "NONE" }).kind, "CHECK_ELIGIBILITY");
  assert.equal(resolvePrimaryDashboardAction({ attentionItems: [], hasActiveClaim: false, hasAnyClaim: false, assessmentState: "COMPLETE" }).kind, "START_CLAIM");
  assert.equal(resolvePrimaryDashboardAction({ attentionItems: [], hasActiveClaim: false, hasAnyClaim: true, assessmentState: "COMPLETE" }).kind, "REVIEW_CLAIM");
});

test("dashboard active claims exclude terminal workflow records", () => {
  assert.equal(isDashboardActiveClaim("IN_PROGRESS"), true);
  assert.equal(isDashboardActiveClaim("COMPLETED"), false);
  assert.equal(isDashboardActiveClaim("CLOSED"), false);
  assert.equal(isDashboardActiveClaim("NOT_ELIGIBLE"), false);
});

test("dashboard activity removes same-claim events that represent the same moment", () => {
  const date = new Date("2026-08-28T10:00:00.000Z");
  const activity = mergeDashboardActivity({ timeline: [{ title: "Evidence requested", description: "Evidence stage", claimReference: "CB-26-ABCDEFGH", occurredAt: date }], notifications: [{ title: "Evidence has been requested", body: "Supporting evidence has been requested.", claimReference: "CB-26-ABCDEFGH", createdAt: new Date(date.getTime() + 20_000), actionHref: "/account/claims/CB-26-ABCDEFGH/evidence" }] });
  assert.equal(activity.length, 1);
  assert.equal(activity[0].claimReference, "CB-26-ABCDEFGH");
});

test("dashboard activity keeps separate claim events and caps the ledger", () => {
  const activity = mergeDashboardActivity({ timeline: Array.from({ length: 10 }, (_, index) => ({ title: `Update ${index}`, description: "A real update", claimReference: `CB-26-${String(index).padStart(8, "0")}`, occurredAt: new Date(Date.UTC(2026, 7, 28, 10, index)) })), notifications: [] });
  assert.equal(activity.length, 8);
});

test("public route architecture and CTA destinations are complete", () => {
  assert.equal(new Set(publicRoutePaths).size, publicRoutePaths.length);
  for (const route of publicRoutePaths) {
    const routeFile = route === "/" ? "src/app/(public)/page.tsx" : `src/app/(public)${route}/page.tsx`;
    assert.equal(fs.existsSync(path.resolve(routeFile)), true, route);
  }
  assert.equal(publicCtas.checkEligibility.href, "/check-eligibility");
  assert.equal(publicCtas.howItWorks.href, "/how-it-works");
  assert.equal(publicCtas.signIn.href, "/sign-in");
});

test("public content keeps scope and metadata safe", () => {
  assert.ok(publicScope.helpsWith.length >= 3);
  assert.ok(publicScope.notPrimaryFor.length >= 3);
  assert.match(publicScope.notPrimaryFor.join(" "), /repairs/i);
  const metadata = createPublicMetadata("A", "B", "/about");
  assert.equal(metadata.alternates?.canonical, "/about");
  assert.equal(metadata.openGraph?.url, "/about");
  const breadcrumbs = makeBreadcrumbs([{ label: "Home", href: "/" }, { label: "Current" }]);
  assert.equal(breadcrumbs.at(-1)?.href, undefined);
});

test("public navigation destinations resolve without exposing account routes", () => {
  const destinations = publicNavigation.flatMap((section) => [section.href, ...(section.items ?? []).map((item) => item.href)]);
  for (const destination of destinations) {
    const route = destination.split("#")[0];
    const routeFile = route === "/" ? "src/app/(public)/page.tsx" : `src/app/(public)${route}/page.tsx`;
    assert.equal(fs.existsSync(path.resolve(routeFile)), true, destination);
    assert.equal(route.startsWith("/account"), false);
  }
});

test("public trust, legal disclosures and sitemap remain configuration-driven", () => {
  assert.equal(verifiedTrustFacts.length, 6);
  for (const fact of verifiedTrustFacts) {
    assert.ok(fact.label);
    assert.ok(fact.description);
  }
  for (const disclosure of Object.values(publicDisclosures)) {
    assert.equal(disclosure.legalReviewRequired, true);
    assert.ok(disclosure.text);
  }
  assert.equal(futureResults.length, 0);
  assert.equal(futureTestimonials.length, 0);
  assert.equal(optionalBusinessDetails.phone, undefined);
  const sitemapPaths = getPublicSitemapPaths();
  assert.ok(sitemapPaths.includes("/why-claims-bridge"));
  assert.ok(sitemapPaths.includes("/security"));
  assert.equal(sitemapPaths.some((route) => route.startsWith("/account") || route.startsWith("/api")), false);
});

test("Knowledge Hub publishing model validates slugs, metadata and publication safety", () => {
  assert.equal(new Set(knowledgeArticles.map((article) => article.slug)).size, knowledgeArticles.length);
  assert.equal(getPublishedArticles().length, 16);
  assert.ok(getPublishedArticles().length <= 20);
  for (const article of getPublishedArticles()) {
    assert.ok(article.title);
    assert.ok(article.description);
    assert.ok(article.excerpt);
    assert.ok(article.author === "Claims Bridge Editorial Team");
    assert.match(article.publishedAt, /^2026-08-28$/);
    assert.match(article.updatedAt, /^2026-08-28$/);
    assert.equal(article.status, "PUBLISHED");
    assert.equal(article.legalReview, "NOT_REQUIRED");
    assert.ok(article.purpose);
    assert.ok(article.contentRisk);
    assert.ok(article.reviewedAt);
    assert.ok(article.nextReviewAt);
    assert.ok(knowledgeCategories[article.category]);
    assert.ok(calculateReadingTime(article) >= 1);
    for (const relatedSlug of article.relatedSlugs) assert.ok(getArticleBySlug(relatedSlug), relatedSlug);
    for (const serviceLink of article.serviceLinks) assert.equal(serviceLink.href.startsWith("/account"), false);
  }
  assert.equal(getArticleBySlug("draft-internal-review-example"), undefined);
  assert.equal(getArticleBySlug("review-only-legal-topic"), undefined);
  assert.equal(getArticleBySlugIncludingUnpublished("draft-internal-review-example")?.status, "DRAFT");
  assert.equal(getArticleBySlugIncludingUnpublished("review-only-legal-topic")?.legalReview, "REVIEW_REQUIRED");
});

test("Knowledge Hub search, categories, routes and structured data are deterministic", () => {
  assert.ok(searchKnowledgeArticles("paperwork").some((article) => article.slug === "organise-tenancy-deposit-paperwork"));
  assert.ok(searchKnowledgeArticles("scheme").length > 0);
  assert.ok(searchKnowledgeArticles("deposit-protection").length > 0);
  assert.equal(searchKnowledgeArticles("no such guidance phrase").length, 0);
  assert.ok(getArticlesByCategory("evidence").every((article) => article.category === "evidence"));
  assert.equal(getKnowledgeHubStaticParams().length, 16);
  const article = getArticleBySlug("eligibility-check-and-claims-bridge-claim");
  assert.ok(article);
  assert.equal(getArticleBreadcrumbs(article).at(-1)?.label, article.title);
  const structured = getArticleStructuredData(article);
  assert.equal(structured.headline, article.title);
  assert.equal(structured.datePublished, article.publishedAt);
  assert.equal(structured.author.name, article.author);
  const sitemap = getPublicSitemapPaths();
  assert.ok(sitemap.includes("/knowledge-hub/eligibility-check-and-claims-bridge-claim"));
  assert.ok(sitemap.includes("/knowledge-hub/category/evidence"));
  assert.equal(sitemap.some((route) => route.includes("draft-internal") || route.includes("review-only")), false);
});

test("Knowledge Hub clusters, pillars and governance audit remain coherent", () => {
  assert.equal(editorialClusters.length, 6);
  for (const cluster of editorialClusters) {
    assert.ok(cluster.pillar.href.startsWith("/"));
    assert.ok(getClusterArticles(cluster).length > 0, cluster.id);
    assert.ok(cluster.relatedServiceRoutes.every((route) => !route.href.startsWith("/account")));
  }
  const audit = getEditorialAudit(new Date("2026-08-28T00:00:00.000Z"));
  assert.equal(audit.errors.length, 0, audit.errors.join("\n"));
  assert.equal(audit.publishedCount, 16);
  assert.equal(audit.draftCount, 1);
  assert.equal(audit.reviewCount, 1);
  assert.equal(audit.reviewDueCount, 0);
  assert.ok(knowledgeTopics.includes("Evidence"));
  assert.ok(getPublishedArticles().filter((article) => article.featured).every((article) => article.status === "PUBLISHED"));
});

test("Knowledge Hub search weights title and topic matches above body matches", () => {
  const titleResults = searchKnowledgeArticles("digital evidence");
  assert.equal(titleResults[0]?.slug, "preparing-digital-evidence-for-review");
  const topicResults = searchKnowledgeArticles("notifications");
  assert.equal(topicResults[0]?.slug, "how-the-claims-bridge-client-portal-helps-track-a-claim");
});

test("Knowledge Hub related content and headings are deterministic", () => {
  const article = getArticleBySlug("tenancy-deposit-document-checklist");
  assert.ok(article);
  const related = getRelatedArticles(article);
  assert.ok(related.length > 0 && related.length <= 3);
  assert.equal(new Set(related.map((item) => item.slug)).size, related.length);
  const headings = getArticleHeadingIds(article);
  assert.equal(new Set(headings.map((heading) => heading.id)).size, headings.length);
  assert.ok(getArticleToc(article).length >= 2);
  assert.equal(getFreshnessState(article, new Date("2026-08-08T00:00:00.000Z")), "CURRENT");
  assert.equal(getFreshnessState({ ...article, nextReviewAt: "2026-08-10" }, new Date("2026-08-28T00:00:00.000Z")), "OVERDUE");
});

test("staff roles and permissions remain centralized and least-privilege", () => {
  assert.equal(staffRoles.length, 6);
  assert.equal(staffPermissions.includes("STAFF_MANAGE"), true);
  assert.equal(isStaffRole("UNSUPPORTED"), false);
  assert.equal(hasPermissionForRole("SUPER_ADMIN", "SETTINGS_MANAGE"), true);
  assert.equal(hasPermissionForRole("CASE_MANAGER", "STAFF_MANAGE"), false);
  assert.equal(hasPermissionForRole("SUPPORT", "STAFF_VIEW"), false);
  assert.equal(hasPermissionForRole("READ_ONLY", "CLAIMS_VIEW"), true);
  assert.equal(hasPermissionForRole("READ_ONLY", "CLAIMS_MANAGE"), false);
  assert.equal(hasPermissionForRole("EVIDENCE_REVIEWER", "CLAIMS_MANAGE"), false);
  assert.equal(hasPermissionForRole("SUPPORT", "CLAIMS_MANAGE"), false);
  assert.equal(new Set(rolePermissions.SUPER_ADMIN).size, staffPermissions.length);
});

test("operational claim controls use a small controlled vocabulary", () => {
  assert.deepEqual(operationalPriorities, ["NORMAL", "ELEVATED", "HIGH"]);
  assert.equal(isOperationalPriority("HIGH"), true);
  assert.equal(isOperationalPriority("CRITICAL"), false);
  assert.deepEqual(claimAssignmentFilters, ["ALL", "MINE", "UNASSIGNED", "ASSIGNED"]);
  assert.equal(internalNoteMaxLength, 10_000);
});

test("staff and note references are opaque and non-sequential", () => {
  const references = new Set(Array.from({ length: 100 }, () => createInternalNoteReference()));
  assert.equal(references.size, 100);
  for (const reference of references) assert.match(reference, NOTE_REFERENCE_PATTERN);
});

test("operations schema preserves assignment history and private notes", () => {
  const schema = fs.readFileSync(path.resolve("src/lib/db/schema/operations.ts"), "utf8");
  const migration = fs.readFileSync(path.resolve("drizzle/0010_bright_sage.sql"), "utf8");
  assert.match(schema, /claim_assignments/);
  assert.match(schema, /claim_internal_notes/);
  assert.match(schema, /uniqueIndex\("claim_assignments_current_claim_unique"/);
  assert.match(schema, /unassignedAt/);
  assert.match(schema, /onDelete: "restrict"/);
  assert.match(migration, /CREATE TABLE "claim_assignments"/);
  assert.match(migration, /CREATE TABLE "claim_internal_notes"/);
  assert.match(migration, /claim_assignments_current_claim_unique/);
  assert.match(migration, /claim_operational_priority/);
});

test("staff claim mutations are permissioned, transactional and audited", () => {
  const service = fs.readFileSync(path.resolve("src/lib/admin/claims/service.ts"), "utf8");
  assert.match(service, /requirePermission\(clerkUserId, "CLAIMS_MANAGE"\)/);
  assert.match(service, /db\.transaction/);
  for (const action of ["CLAIM_PRIORITY_CHANGED", "CLAIM_ASSIGNED", "CLAIM_REASSIGNED", "CLAIM_UNASSIGNED", "CLAIM_INTERNAL_NOTE_ADDED"]) {
    assert.match(service, new RegExp(action));
  }
  assert.doesNotMatch(service, /body[^\n]*metadata/);
});

test("assignment service derives staff identity and rejects suspended or unsuitable staff", () => {
  const service = fs.readFileSync(path.resolve("src/lib/admin/claims/service.ts"), "utf8");
  assert.match(service, /getActorIdInTransaction/);
  assert.match(service, /staffUsers\.clerkUserId/);
  assert.match(service, /staff\.status !== "ACTIVE"/);
  assert.match(service, /hasPermissionForRole\(staff\.role, "CLAIMS_MANAGE"\)/);
  assert.match(service, /assignClaimToSelf/);
});

test("claim queue search is server-authorized, URL-filtered and paginated", () => {
  const repository = fs.readFileSync(path.resolve("src/lib/admin/claims/repository.ts"), "utf8");
  assert.match(repository, /requirePermission\(clerkUserId, "CLAIMS_VIEW"\)/);
  assert.match(repository, /ilike\(claims\.claimReference/);
  assert.match(repository, /ilike\(clientProfiles\.firstName/);
  assert.match(repository, /orderFor/);
  assert.match(repository, /\.limit\(queuePageSize\)\.offset/);
  assert.match(repository, /evidenceAttention/);
});

test("admin workspace view models omit raw identity and storage identifiers", () => {
  const repository = fs.readFileSync(path.resolve("src/lib/admin/claims/repository.ts"), "utf8");
  assert.match(repository, /claimReference/);
  assert.match(repository, /displayName/);
  assert.doesNotMatch(repository, /clerkUserId:\s*base/);
  assert.doesNotMatch(repository, /storageKey/);
  assert.doesNotMatch(repository, /databaseId/);
});

test("internal operational state is excluded from client claim reads", () => {
  const claimRepository = fs.readFileSync(path.resolve("src/lib/claims/repository.ts"), "utf8");
  const dashboard = fs.readFileSync(path.resolve("src/lib/dashboard/service.ts"), "utf8");
  assert.match(claimRepository, /clientClaimColumns/);
  assert.doesNotMatch(claimRepository, /operationalPriority:\s*claims\.operationalPriority/);
  assert.doesNotMatch(dashboard, /operationalPriority:\s*claims\.operationalPriority/);
});

test("Phase 10B does not expose later operational mutations", () => {
  const adminSources = (fs.readdirSync(path.resolve("src/app/admin/claims"), { recursive: true }) as string[]).filter((entry) => entry.endsWith(".tsx"));
  const source = adminSources.map((entry) => fs.readFileSync(path.resolve("src/app/admin/claims", entry), "utf8")).join("\n");
  assert.doesNotMatch(source, /transitionClaimStatus/);
  assert.doesNotMatch(source, /updateEvidenceRequirementStatus/);
  assert.doesNotMatch(source, /createClaimsBridgeMessage/);
  assert.doesNotMatch(source, /Reply to client|Send reply/);
});

test("admin claims are absent from public indexing and navigation", () => {
  const adminLayout = fs.readFileSync(path.resolve("src/app/admin/layout.tsx"), "utf8");
  const robotsSource = fs.readFileSync(path.resolve("src/app/robots.ts"), "utf8");
  assert.match(adminLayout, /index: false/);
  assert.match(robotsSource, /"\/admin"/);
  assert.equal(getPublicSitemapPaths().some((route) => route.startsWith("/admin")), false);
});

test("staff reference and sanitized context do not expose Clerk or database identifiers", () => {
  assert.match(createStaffReference(), STAFF_REFERENCE_PATTERN);
  const authorizationSource = fs.readFileSync(path.resolve("src/lib/staff/authorization.ts"), "utf8");
  assert.match(authorizationSource, /server-only/);
  assert.match(authorizationSource, /return \{ staffReference:/);
  assert.doesNotMatch(authorizationSource, /return \{\s*clerkUserId/);
  assert.doesNotMatch(authorizationSource, /return \{\s*id:/);
});

test("audit metadata is allow-listed and admin boundaries are not public", () => {
  const auditSource = fs.readFileSync(path.resolve("src/lib/staff/audit.ts"), "utf8");
  assert.match(auditSource, /server-only/);
  assert.match(auditSource, /previousRole/);
  assert.match(auditSource, /reasonCode/);
  assert.doesNotMatch(auditSource, /messageBody/);
  assert.doesNotMatch(auditSource, /token/);
  const proxySource = fs.readFileSync(path.resolve("src/proxy.ts"), "utf8");
  const robotsSource = fs.readFileSync(path.resolve("src/app/robots.ts"), "utf8");
  assert.match(proxySource, /isAdminRoute/);
  assert.match(robotsSource, /"\/admin"/);
  assert.equal(getPublicSitemapPaths().some((route) => route.startsWith("/admin")), false);
  const publicDestinations = publicNavigation.flatMap((section) => [section.href, ...(section.items ?? []).map((item) => item.href)]);
  assert.equal(publicDestinations.some((route) => route.startsWith("/admin")), false);
});

test("staff management and bootstrap source preserve lockout protections", () => {
  const serviceSource = fs.readFileSync(path.resolve("src/lib/staff/service.ts"), "utf8");
  const bootstrapSource = fs.readFileSync(path.resolve("scripts/bootstrap-staff.ts"), "utf8");
  const migration = fs.readFileSync(path.resolve("drizzle/0009_odd_azazel.sql"), "utf8");
  assert.match(serviceSource, /LAST_SUPER_ADMIN/);
  assert.match(serviceSource, /db\.transaction/);
  assert.match(bootstrapSource, /STAFF_BOOTSTRAP_CLERK_USER_ID/);
  assert.match(bootstrapSource, /staffCount > 0/);
  assert.match(migration, /CREATE TABLE "staff_users"/);
  assert.match(migration, /CREATE TABLE "staff_audit_events"/);
  assert.match(migration, /staff_users_clerk_user_id_unique/);
});

test("Phase 10C workflow graphs remain canonical and document review is deliberately gated", () => {
  assert.equal(canTransitionDocumentStatus("UPLOADED", "UNDER_REVIEW"), true);
  assert.equal(canTransitionDocumentStatus("UNDER_REVIEW", "ACCEPTED"), true);
  assert.equal(canTransitionDocumentStatus("UNDER_REVIEW", "REPLACEMENT_REQUESTED"), true);
  assert.equal(canTransitionDocumentStatus("ACCEPTED", "UNDER_REVIEW"), false);
  assert.deepEqual(documentStatuses, ["PENDING_UPLOAD", "UPLOADED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "REPLACEMENT_REQUESTED"]);
  assert.equal(documentStatusLabels.ACCEPTED, "Recorded as accepted");
});

test("evidence requirements use opaque references and controlled request vocabulary", () => {
  const references = new Set(Array.from({ length: 100 }, () => createEvidenceRequirementReference()));
  assert.equal(references.size, 100);
  for (const reference of references) assert.match(reference, EVIDENCE_REQUIREMENT_REFERENCE_PATTERN);
  assert.deepEqual(evidenceRequirementPriorities, ["LOW", "NORMAL", "HIGH"]);
  assert.equal(evidenceRequirementConfig.IDENTITY_DOCUMENT.sensitivity, "sensitive");
});

test("Phase 10C migration safely adds evidence references and workflow audit actions", () => {
  const migration = fs.readFileSync(path.resolve("drizzle/0011_nappy_fat_cobra.sql"), "utf8");
  for (const action of ["CLAIM_STATUS_CHANGED", "EVIDENCE_REQUESTED", "EVIDENCE_STATUS_CHANGED", "DOCUMENT_STATUS_CHANGED"]) assert.match(migration, new RegExp(action));
  assert.match(migration, /UPDATE "claim_evidence_requirements"/);
  assert.match(migration, /requirement_reference_unique/);
  assert.match(migration, /SET NOT NULL/);
});

test("staff workflow service delegates to canonical domains and audits every mutation", () => {
  const source = fs.readFileSync(path.resolve("src/lib/admin/claims/workflow-service.ts"), "utf8");
  for (const permission of ["CLAIMS_TRANSITION_STATUS", "EVIDENCE_REQUEST", "EVIDENCE_REVIEW", "DOCUMENTS_REVIEW"]) assert.match(source, new RegExp(`requirePermission\\(clerkUserId, "${permission}"\\)`));
  for (const canonical of ["transitionClaimStatusInTransaction", "requestEvidenceInTransaction", "updateEvidenceRequirementStatusInTransaction", "transitionDocumentStatusInTransaction"]) assert.match(source, new RegExp(canonical));
  for (const action of ["CLAIM_STATUS_CHANGED", "EVIDENCE_REQUESTED", "EVIDENCE_STATUS_CHANGED", "DOCUMENT_STATUS_CHANGED"]) assert.match(source, new RegExp(action));
  assert.match(source, /actorType: "STAFF"/);
  assert.doesNotMatch(source, /actorStaffUserId: clerkUserId/);
});

test("staff workflow UI uses opaque targets and does not expose later-phase reply or deletion controls", () => {
  const actions = fs.readFileSync(path.resolve("src/app/admin/claims/actions.ts"), "utf8");
  const evidencePage = fs.readFileSync(path.resolve("src/app/admin/claims/[claimReference]/evidence/page.tsx"), "utf8");
  const documentsPage = fs.readFileSync(path.resolve("src/app/admin/claims/[claimReference]/documents/page.tsx"), "utf8");
  assert.match(actions, /CB-EVR-\[0-9A-F\]\{8\}/);
  assert.match(actions, /documentReferenceSchema = z\.string\(\)\.uuid/);
  assert.match(evidencePage, /AdminEvidenceRequestForm/);
  assert.match(evidencePage, /AdminEvidenceRequirementActions/);
  assert.match(documentsPage, /AdminDocumentReviewControls/);
  assert.doesNotMatch(`${evidencePage}\n${documentsPage}`, /Delete document|Reply to client|Send reply|transitionClaimStatus/);
});

test("technical document review remains unavailable without secure storage configuration", () => {
  const service = fs.readFileSync(path.resolve("src/lib/documents/service.ts"), "utf8");
  assert.match(service, /isR2Configured/);
  assert.match(service, /securityStatus !== "VALIDATED"/);
  assert.match(service, /storageKey/);
  assert.match(service, /Binary document access is not configured/);
  assert.match(service, /function publicDocument/);
});

test("client-facing repositories do not return staff workflow fields", () => {
  const clientClaim = fs.readFileSync(path.resolve("src/lib/claims/repository.ts"), "utf8");
  const clientEvidence = fs.readFileSync(path.resolve("src/lib/evidence/repository.ts"), "utf8");
  const dashboard = fs.readFileSync(path.resolve("src/lib/dashboard/service.ts"), "utf8");
  assert.doesNotMatch(clientClaim, /operationalPriority/);
  assert.doesNotMatch(dashboard, /operationalPriority/);
  assert.doesNotMatch(clientEvidence, /staffAudit|internalNote|staffReference/);
});

test("Phase 10D client actions use a small controlled vocabulary and opaque references", () => {
  assert.deepEqual(clientActionStatuses, ["OPEN", "COMPLETED", "CANCELLED"]);
  assert.equal(clientActionTypes.length, 5);
  assert.equal(clientActionConfig.CONTACT_CLAIMS_BRIDGE.clientCanComplete, false);
  const refs = new Set(Array.from({ length: 100 }, () => createClientActionReference()));
  assert.equal(refs.size, 100);
  for (const ref of refs) assert.match(ref, CLIENT_ACTION_REFERENCE_PATTERN);
});

test("Phase 10D messaging and action boundaries are server-authorized and client-safe", () => {
  const messaging = fs.readFileSync(path.resolve("src/lib/admin/claims/messaging-service.ts"), "utf8");
  const actions = fs.readFileSync(path.resolve("src/lib/admin/claims/action-service.ts"), "utf8");
  const clientActions = fs.readFileSync(path.resolve("src/lib/actions/repository.ts"), "utf8");
  assert.match(messaging, /MESSAGES_REPLY/);
  assert.match(messaging, /MESSAGES_MANAGE_CONVERSATION/);
  assert.match(messaging, /senderType: "CLAIMS_BRIDGE"/);
  assert.match(messaging, /CLAIM_MESSAGE_SENT/);
  assert.doesNotMatch(messaging, /messageBody/);
  assert.match(actions, /CLAIMS_MANAGE/);
  assert.match(actions, /CLIENT_ACTION_REQUIRED/);
  assert.match(actions, /CLIENT_ACTION_CREATED/);
  assert.match(clientActions, /clientVisible/);
  assert.match(clientActions, /getClaimForClient/);
  assert.doesNotMatch(clientActions, /staffUsers|operationalPriority|internalNote/);
});

test("Phase 10D schema and UI keep messages, actions and later-phase capabilities distinct", () => {
  const migration = fs.readFileSync(path.resolve("drizzle/0013_lively_christian_walker.sql"), "utf8");
  const messagePage = fs.readFileSync(path.resolve("src/app/admin/claims/[claimReference]/messages/page.tsx"), "utf8");
  const messageUi = fs.readFileSync(path.resolve("src/components/admin/admin-message-workspace.tsx"), "utf8");
  assert.match(migration, /claim_action_requirements/);
  assert.match(migration, /client_request_id/);
  assert.match(messagePage, /getAdminClaimMessagingWorkspace/);
  assert.match(messageUi, /Send as Claims Bridge/);
  assert.match(messageUi, /Close conversation/);
  assert.doesNotMatch(messageUi, /attachment|typing|presence/i);
});

test("Phase 10E client references are opaque, random and unique in a sample", () => {
  const references = new Set(Array.from({ length: 100 }, () => createClientReference()));
  assert.equal(references.size, 100);
  for (const reference of references) assert.match(reference, CLIENT_REFERENCE_PATTERN);
});

test("Phase 10E operations repositories are server-only and permission-scoped", () => {
  const repository = fs.readFileSync(path.resolve("src/lib/admin/operations/repository.ts"), "utf8");
  assert.match(repository, /import "server-only"/);
  for (const permission of ["MESSAGES_VIEW", "EVIDENCE_VIEW", "DOCUMENTS_VIEW", "CLAIMS_VIEW", "CLIENTS_VIEW", "STAFF_VIEW"]) assert.match(repository, new RegExp(permission));
  assert.match(repository, /limit\(5\)/);
  assert.doesNotMatch(repository, /message body|internal notes|document contents/i);
  assert.doesNotMatch(repository, /clerkUserId:\s*row|storageKey/);
});

test("Phase 10E global routes stay private and use safe references", () => {
  const routes = ["messages", "evidence", "documents", "client-actions", "clients", "search"];
  for (const route of routes) {
    const source = fs.readFileSync(path.resolve(`src/app/admin/${route}/page.tsx`), "utf8");
    assert.match(source, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
    assert.match(source, /AdminAccessDenied/);
  }
  const clientPage = fs.readFileSync(path.resolve("src/app/admin/clients/[clientReference]/page.tsx"), "utf8");
  assert.match(clientPage, /clientReference/);
  assert.doesNotMatch(clientPage, /clerkUserId|\bdbId\b/);
});

test("Phase 10E migration adds a safe backfilled client reference without changing prior migrations", () => {
  const migration = fs.readFileSync(path.resolve("drizzle/0014_empty_taskmaster.sql"), "utf8");
  assert.match(migration, /ADD COLUMN "client_reference" text/);
  assert.match(migration, /gen_random_uuid/);
  assert.match(migration, /SET NOT NULL/);
  assert.match(migration, /client_profiles_client_reference_unique/);
  assert.equal(fs.existsSync(path.resolve("drizzle/0015_flat_banshee.sql")), true);
});

test("Phase 10F adds only the required client-profile audit enum value", () => {
  const migration = fs.readFileSync(path.resolve("drizzle/0015_flat_banshee.sql"), "utf8");
  assert.match(migration, /ALTER TYPE.*staff_audit_action.*CLIENT_PROFILE_UPDATED/);
  assert.doesNotMatch(migration, /CREATE TABLE|ADD COLUMN|DROP|DELETE/i);
});

test("Phase 10E navigation contains only permission-aware functional queue destinations", () => {
  const source = fs.readFileSync(path.resolve("src/components/admin/admin-navigation.tsx"), "utf8");
  for (const route of ["/admin/messages", "/admin/evidence", "/admin/documents", "/admin/client-actions", "/admin/clients"]) assert.match(source, new RegExp(route.replaceAll("/", "\\/")));
  assert.match(source, /hasPermissionForRole/);
  assert.doesNotMatch(source, /leaderboard|performance|analytics/i);
});

test("Phase 10F staff management remains centralized and protected", () => {
  const service = fs.readFileSync(path.resolve("src/lib/staff/service.ts"), "utf8");
  const provisioning = fs.readFileSync(path.resolve("src/lib/staff/provisioning.ts"), "utf8");
  const team = fs.readFileSync(path.resolve("src/app/admin/team/page.tsx"), "utf8");
  assert.match(service, /STAFF_MANAGE/);
  assert.match(service, /SUPER_ADMIN/);
  assert.match(service, /LAST_SUPER_ADMIN/);
  assert.match(service, /confirmed/);
  assert.match(provisioning, /clerkClient/);
  assert.match(provisioning, /getUserList/);
  assert.match(provisioning, /verification\?\.status === "verified"/);
  assert.doesNotMatch(provisioning, /console\.log/);
  assert.match(team, /STAFF_MANAGE/);
  assert.match(team, /AdminStaffProvisioningForm/);
  assert.match(team, /AdminStaffRowActions/);
  assert.doesNotMatch(team, /Delete staff/i);
});

test("Phase 10F client corrections are allow-listed, concurrent and audited without PII values", () => {
  const service = fs.readFileSync(path.resolve("src/lib/clients/admin-service.ts"), "utf8");
  const action = fs.readFileSync(path.resolve("src/app/admin/clients/actions.ts"), "utf8");
  const page = fs.readFileSync(path.resolve("src/app/admin/clients/[clientReference]/page.tsx"), "utf8");
  assert.match(service, /CLIENTS_MANAGE/);
  assert.match(service, /EDITABLE_FIELDS/);
  assert.match(service, /expectedUpdatedAt/);
  assert.match(service, /CLIENT_PROFILE_UPDATED/);
  assert.match(service, /changedFields/);
  assert.doesNotMatch(service, /set\(\{[^}]*clerkUserId|set\(\{[^}]*clientReference/);
  assert.match(action, /updateClientOperationalProfile/);
  assert.match(page, /AdminClientCorrectionForm/);
});

test("Phase 10F audit explorer and system status are protected and sanitized", () => {
  const repository = fs.readFileSync(path.resolve("src/lib/staff/repository.ts"), "utf8");
  const auditPage = fs.readFileSync(path.resolve("src/app/admin/audit/page.tsx"), "utf8");
  const status = fs.readFileSync(path.resolve("src/lib/system/status.ts"), "utf8");
  const systemPage = fs.readFileSync(path.resolve("src/app/admin/system/page.tsx"), "utf8");
  assert.match(repository, /getStaffAuditExplorer/);
  assert.match(repository, /AUDIT_VIEW/);
  for (const field of ["action", "actor", "targetType", "targetReference", "from", "to"]) assert.match(auditPage, new RegExp(field));
  assert.doesNotMatch(auditPage, /Edit audit|Delete audit|Archive audit/i);
  assert.match(systemPage, /SETTINGS_VIEW/);
  assert.match(status, /databaseReachability/);
  assert.match(status, /documentStorage/);
  assert.doesNotMatch(status, /return\s+process\.env/);
});

test("Phase 10F readiness keeps bootstrap explicit, admin dynamic and undocumented secrets absent", () => {
  const env = fs.readFileSync(path.resolve("scripts/check-env.mjs"), "utf8");
  const layout = fs.readFileSync(path.resolve("src/app/admin/layout.tsx"), "utf8");
  const docs = ["docs/admin-operations.md", "docs/admin-e2e-checklist.md", "docs/production-readiness.md"].map((file) => fs.readFileSync(path.resolve(file), "utf8")).join("\n");
  assert.match(env, /BOOTSTRAP_SUPER_ADMIN_CLERK_USER_ID/);
  assert.match(env, /optional \/ not configured/);
  assert.doesNotMatch(env, /console\.log\(.*process\.env\[/);
  assert.match(layout, /force-dynamic/);
  assert.doesNotMatch(docs, /pk_[A-Za-z0-9]|sk_[A-Za-z0-9]|user_[A-Za-z0-9]+/);
  assert.match(docs, /Clerk authenticates/);
  assert.match(docs, /R2/);
});

test("Phase 10G bootstrap is an explicit async CLI with verified identity and sanitized failure output", () => {
  const source = fs.readFileSync(path.resolve("scripts/bootstrap-staff.ts"), "utf8");
  assert.match(source, /STAFF_BOOTSTRAP_CLERK_USER_ID/);
  assert.match(source, /BOOTSTRAP_SUPER_ADMIN_CLERK_USER_ID/);
  assert.match(source, /users\.getUser\(clerkUserId\)/);
  assert.match(source, /verification\?\.status === "verified"/);
  assert.match(source, /STAFF_BOOTSTRAPPED/);
  assert.match(source, /main\(\)\.catch/);
  assert.doesNotMatch(source, /console\.log\([^)]*clerkUserId/);
});

test("Phase 10G production checks require a canonical HTTPS origin and safe headers are configured", () => {
  const env = fs.readFileSync(path.resolve("scripts/check-env.mjs"), "utf8");
  const smoke = fs.readFileSync(path.resolve("scripts/smoke-production.mjs"), "utf8");
  const nextConfig = fs.readFileSync(path.resolve("next.config.ts"), "utf8");
  const packageJson = fs.readFileSync(path.resolve("package.json"), "utf8");
  assert.match(env, /NEXT_PUBLIC_SITE_URL/);
  assert.match(env, /optional in development/);
  assert.match(env, /Clerk key mode/);
  assert.match(packageJson, /check-env\.mjs --production/);
  assert.match(smoke, /HTTPS production origin/);
  assert.match(smoke, /\/robots\.txt/);
  assert.match(nextConfig, /X-Content-Type-Options/);
  assert.match(nextConfig, /X-Frame-Options/);
  assert.match(nextConfig, /Referrer-Policy/);
  assert.doesNotMatch(nextConfig, /Content-Security-Policy/);
});

test("Clerk path routing uses public optional catch-all auth routes and preserves safe fallback redirects", () => {
  const signInPath = path.resolve("src/app/sign-in/[[...sign-in]]/page.tsx");
  const signUpPath = path.resolve("src/app/sign-up/[[...sign-up]]/page.tsx");
  const proxy = fs.readFileSync(path.resolve("src/proxy.ts"), "utf8");

  assert.ok(fs.existsSync(signInPath));
  assert.ok(fs.existsSync(signUpPath));
  assert.equal(fs.existsSync(path.resolve("src/app/sign-in/page.tsx")), false);
  assert.equal(fs.existsSync(path.resolve("src/app/sign-up/page.tsx")), false);
  assert.match(fs.readFileSync(signInPath, "utf8"), /routing="path" path="\/sign-in"/);
  assert.match(fs.readFileSync(signInPath, "utf8"), /fallbackRedirectUrl="\/account"/);
  assert.match(fs.readFileSync(signUpPath, "utf8"), /routing="path" path="\/sign-up"/);
  assert.match(proxy, /isAccountRoute/);
  assert.match(proxy, /isAdminRoute/);
});

test("public navigation uses stable item identifiers for duplicate destinations", () => {
  const header = fs.readFileSync(path.resolve("src/components/navigation/public-header.tsx"), "utf8");
  const rootLayout = fs.readFileSync(path.resolve("src/app/layout.tsx"), "utf8");
  const items = publicNavigation.flatMap((section) => section.items ?? []);
  const ids = items.map((item) => item.id);

  assert.equal(new Set(ids).size, ids.length);
  assert.equal(items.filter((item) => item.href === "/knowledge-hub").length, 1);
  assert.equal(items.filter((item) => item.href === "/guides/deposit-protection").length, 3);
  assert.match(header, /key=\{item\.id\}/);
  assert.match(rootLayout, /data-scroll-behavior="smooth"/);
});

test("Phase 11A uses opaque assessment references, real account routes, and reversible claim archival", () => {
  const assessmentReferences = new Set(Array.from({ length: 100 }, () => createAssessmentReference()));
  assert.equal(assessmentReferences.size, 100);
  for (const reference of assessmentReferences) assert.match(reference, ASSESSMENT_REFERENCE_PATTERN);

  const migration = fs.readFileSync(path.resolve("drizzle/0016_orange_mesmero.sql"), "utf8");
  const claimsSchema = fs.readFileSync(path.resolve("src/lib/db/schema/claims.ts"), "utf8");
  const assessmentSchema = fs.readFileSync(path.resolve("src/lib/db/schema/eligibility.ts"), "utf8");
  const archiveService = fs.readFileSync(path.resolve("src/lib/admin/claims/service.ts"), "utf8");
  const accountProfile = fs.readFileSync(path.resolve("src/app/account/profile/page.tsx"), "utf8");
  const accountDocuments = fs.readFileSync(path.resolve("src/app/account/documents/page.tsx"), "utf8");
  const assessmentIndex = fs.readFileSync(path.resolve("src/app/account/assessments/page.tsx"), "utf8");
  const assessmentDetail = fs.readFileSync(path.resolve("src/app/account/assessments/[assessmentReference]/page.tsx"), "utf8");
  const adminClientProfile = fs.readFileSync(path.resolve("src/app/admin/clients/[clientReference]/page.tsx"), "utf8");
  const adminAssessmentDetail = fs.readFileSync(path.resolve("src/app/admin/clients/[clientReference]/assessments/[assessmentReference]/page.tsx"), "utf8");
  const claimNavigation = fs.readFileSync(path.resolve("src/config/navigation.ts"), "utf8");
  const verifier = fs.readFileSync(path.resolve("scripts/verify-db.mjs"), "utf8");

  assert.match(migration, /assessment_reference/);
  assert.match(migration, /archived_at/);
  assert.match(migration, /CLAIM_ARCHIVED/);
  assert.match(migration, /CLAIM_RESTORED/);
  assert.match(migration, /UPDATE "eligibility_assessments"/);
  assert.match(assessmentSchema, /assessmentReference/);
  assert.match(claimsSchema, /archivedAt/);
  assert.match(archiveService, /CLAIMS_ARCHIVE/);
  assert.match(archiveService, /archiveReason/);
  assert.match(archiveService, /restoreArchivedClaim/);
  assert.match(accountProfile, /ClientProfileForm/);
  assert.doesNotMatch(accountProfile, /AccountPlaceholder/);
  assert.match(accountDocuments, /getDocumentIndexForClient/);
  assert.match(assessmentIndex, /getAssessmentsForClient/);
  assert.match(assessmentDetail, /getVisibleQuestions/);
  assert.match(adminClientProfile, /getClientAssessmentsForAdmin/);
  assert.match(adminAssessmentDetail, /getClientAssessmentForAdmin/);
  assert.match(adminAssessmentDetail, /getVisibleQuestions/);
  assert.doesNotMatch(claimNavigation, /label: "Updates"/);
  assert.match(verifier, /claim_migrations_recorded/);
  assert.match(verifier, /\) = 17/);
});

test("Phase 11C exposes durable cross-client leads and assessments only through staff-authorized repositories", () => {
  const operations = fs.readFileSync(path.resolve("src/lib/admin/operations/repository.ts"), "utf8");
  const navigation = fs.readFileSync(path.resolve("src/components/admin/admin-navigation.tsx"), "utf8");
  const overview = fs.readFileSync(path.resolve("src/app/admin/page.tsx"), "utf8");
  const leads = fs.readFileSync(path.resolve("src/app/admin/leads/page.tsx"), "utf8");
  const assessments = fs.readFileSync(path.resolve("src/app/admin/assessments/page.tsx"), "utf8");
  const persistence = fs.readFileSync(path.resolve("src/lib/eligibility/persistence/repository.ts"), "utf8");

  assert.match(operations, /getAdminLeadQueue/);
  assert.match(operations, /getAdminAssessmentQueue/);
  assert.match(operations, /requirePermission\(clerkUserId, "CLIENTS_VIEW"\)/);
  assert.match(operations, /eligibilityAssessments/);
  assert.match(operations, /not exists \(select 1 from claims/);
  assert.match(leads, /getAdminLeadQueue/);
  assert.match(assessments, /getAdminAssessmentQueue/);
  assert.match(assessments, /\/admin\/assessments\/\$\{encodeURIComponent\(item\.assessmentReference\)\}/);
  assert.match(navigation, /label: "Leads"/);
  assert.match(navigation, /label: "Assessments"/);
  assert.match(overview, /totalClients/);
  assert.match(overview, /assessmentsWithoutClaims/);
  assert.match(persistence, /HANDOFF_MINUTES = 45/);
  assert.doesNotMatch(leads, /clerkUserId|assessment\.answers|tokenHash/);
  assert.doesNotMatch(assessments, /clerkUserId|assessment\.answers|tokenHash/);
});

const leadInput = { firstName: "A", email: "RENTER@example.com", preferredContactMethod: "email", serviceContactConsent: "yes", associationKey: "123456789012345678901234", assessment: { version: 1, status: "complete", currentStepId: "review", answers: {}, startedAt: null } };
test("lead references are opaque and formatted safely", () => { const refs = new Set(Array.from({ length: 100 }, createLeadReference)); assert.equal(refs.size, 100); for (const ref of refs) assert.match(ref, LEAD_REFERENCE_PATTERN); });
test("lead capture requires service consent and defaults marketing to false", () => { const parsed = leadCaptureSchema.parse(leadInput); assert.equal(parsed.email, "renter@example.com"); assert.equal(parsed.marketingConsent, false); assert.throws(() => leadCaptureSchema.parse({ ...leadInput, serviceContactConsent: undefined })); });
test("lead capture rejects malformed contact details and honeypots", () => { assert.throws(() => leadCaptureSchema.parse({ ...leadInput, email: "bad" })); assert.throws(() => leadCaptureSchema.parse({ ...leadInput, honeypot: "filled" })); });
test("lead status graph keeps conversion system-derived", () => { assert.equal(canChangeLeadStatus("NEW", "CONTACTED"), true); assert.equal(canChangeLeadStatus("NEW", "CONVERTED"), false); assert.equal(canChangeLeadStatus("CONVERTED", "CLOSED"), false); assert.equal(isSystemDerivedLeadStatus("CONVERTED"), true); });
test("lead implementation preserves ownership and claim boundaries", () => { const service = fs.readFileSync(path.resolve("src/lib/leads/service.ts"), "utf8"); assert.match(service, /db\.transaction/); assert.match(service, /convertedClientProfileId/); assert.match(service, /convertedAssessmentId/); assert.doesNotMatch(service, /insert\(claims\)/); });
test("lead audit metadata remains sanitized and staff-only", () => { const audit = fs.readFileSync(path.resolve("src/lib/staff/audit.ts"), "utf8"); const service = fs.readFileSync(path.resolve("src/lib/leads/service.ts"), "utf8"); assert.match(audit, /leadStatus/); assert.match(service, /LEADS_MANAGE/); assert.match(service, /LEAD_NOTE_ADDED/); assert.doesNotMatch(service, /metadata:.*body/); });
test("lead migration is additive and follows migration 0016", () => { const migration = fs.readFileSync(path.resolve("drizzle/0017_tranquil_norrin_radd.sql"), "utf8"); assert.match(migration, /CREATE TABLE "eligibility_leads"/); assert.match(migration, /eligibility_lead_conversion_tokens/); assert.match(migration, /eligibility_lead_notes/); assert.equal(fs.existsSync(path.resolve("drizzle/0016_orange_mesmero.sql")), true); });

const validProfile = { firstName: "  Ada  ", lastName: "  Lovelace ", phone: "07700 900123", bio: "Tenant seeking clear written updates.", addressLine1: "  1 Example Road ", addressLine2: "", city: " Newcastle-under-Lyme ", region: " Staffordshire ", postcode: " ST5 1AA ", country: " United Kingdom ", preferredContactMethod: "email" as const, preferredContactTime: "afternoon" as const, preferredContactTimeNote: "" };

test("custom location accepts canonical UK place names and preserves the predefined route", () => {
  const jurisdiction = getQuestionById("jurisdiction");
  const customLocation = getQuestionById("custom_location");
  assert.ok(jurisdiction && customLocation);
  assert.deepEqual(validateQuestionAnswer(jurisdiction, "england", { jurisdiction: "england" }), { valid: true });
  assert.deepEqual(validateQuestionAnswer(customLocation, "Newcastle-under-Lyme", { jurisdiction: "custom", custom_location: "Newcastle-under-Lyme" }), { valid: true });
  for (const location of ["St. Ives", "King's Lynn", "Bishop's-Stortford", "New Town"]) assert.equal(customLocationPattern.test(location), true);
});

test("custom location validation and canonicalisation reject unsafe or out-of-range values", () => {
  const customLocation = getQuestionById("custom_location");
  assert.ok(customLocation);
  assert.equal(normalizeCustomLocation("  Newcastle   under-Lyme  "), "Newcastle under-Lyme");
  assert.equal(validateQuestionAnswer(customLocation, "A", { jurisdiction: "custom", custom_location: "A" }).valid, false);
  assert.equal(validateQuestionAnswer(customLocation, "A".repeat(121), { jurisdiction: "custom", custom_location: "A".repeat(121) }).valid, false);
  assert.equal(validateQuestionAnswer(customLocation, "Newcastle 1", { jurisdiction: "custom", custom_location: "Newcastle 1" }).valid, false);
});

test("custom location is required only for the other-location route and stale values are pruned", () => {
  assert.equal(assessmentPayloadSchema.safeParse({ version: 1, status: "in-progress", currentStepId: "custom_location", answers: { jurisdiction: "custom" }, startedAt: null }).success, false);
  assert.equal(assessmentPayloadSchema.safeParse({ version: 1, status: "in-progress", currentStepId: "custom_location", answers: { jurisdiction: "custom", custom_location: "  Newcastle-under-Lyme  " }, startedAt: null }).success, true);
  assert.deepEqual(pruneHiddenAnswers({ jurisdiction: "england", custom_location: "Newcastle-under-Lyme" }), { jurisdiction: "england" });
  assert.deepEqual(pruneHiddenAnswers({ jurisdiction: "custom", custom_location: "Newcastle-under-Lyme" }), { jurisdiction: "custom", custom_location: "Newcastle-under-Lyme" });
});

test("custom location is rendered as a professional review value and never as a profile address", () => {
  const review = fs.readFileSync(path.resolve("src/components/eligibility/eligibility-review.tsx"), "utf8");
  const assessment = fs.readFileSync(path.resolve("src/components/eligibility/eligibility-assessment.tsx"), "utf8");
  const profileActions = fs.readFileSync(path.resolve("src/app/account/profile/actions.ts"), "utf8");
  assert.match(review, /Custom — \$\{String\(answers\.custom_location/);
  assert.match(assessment, /custom_location: normalizeCustomLocation/);
  assert.doesNotMatch(profileActions, /custom_location|jurisdiction/);
  assert.equal(getReviewQuestions({ jurisdiction: "custom", custom_location: "Newcastle-under-Lyme" }, ["jurisdiction", "custom_location"]).some((question) => question.id === "custom_location"), true);
});

test("profile validation normalises presentation fields without treating contact details as verified identity", () => {
  const parsed = profileSchema.parse(validProfile);
  assert.equal(parsed.firstName, "Ada");
  assert.equal(parsed.lastName, "Lovelace");
  assert.equal(parsed.phone, "+447700900123");
  assert.equal(parsed.city, "Newcastle-under-Lyme");
  assert.equal(normalisePhone("0044 7700 900123"), "+447700900123");
  const form = fs.readFileSync(path.resolve("src/components/account/client-profile-form.tsx"), "utf8");
  assert.match(form, /Verified account email/);
  assert.match(form, /managed and verified by Clerk/);
  assert.match(form, /Not verified/);
});

test("profile validation bounds bio, address and contact preference values", () => {
  assert.equal(profileSchema.safeParse({ ...validProfile, bio: "" }).success, true);
  assert.equal(profileSchema.safeParse({ ...validProfile, bio: "<strong>Unsafe</strong>" }).success, false);
  assert.equal(profileSchema.safeParse({ ...validProfile, bio: "a".repeat(501) }).success, false);
  assert.equal(profileSchema.safeParse({ ...validProfile, phone: "123", preferredContactMethod: "phone" }).success, false);
  assert.equal(profileSchema.safeParse({ ...validProfile, preferredContactMethod: "carrier-pigeon" }).success, false);
  assert.equal(profileSchema.safeParse({ ...validProfile, preferredContactTime: "custom", preferredContactTimeNote: "  Weekdays after 17:00  " }).data?.preferredContactTimeNote, "Weekdays after 17:00");
  assert.equal(profileSchema.safeParse({ ...validProfile, preferredContactTime: "custom", preferredContactTimeNote: "" }).success, false);
});

test("profile ownership and lead conversion preserve the authenticated profile boundary", () => {
  const repository = fs.readFileSync(path.resolve("src/lib/clients/repository.ts"), "utf8");
  const actions = fs.readFileSync(path.resolve("src/app/account/profile/actions.ts"), "utf8");
  const onboarding = fs.readFileSync(path.resolve("src/app/account/onboarding/actions.ts"), "utf8");
  const leadService = fs.readFileSync(path.resolve("src/lib/leads/service.ts"), "utf8");
  assert.match(actions, /auth\(\)/);
  assert.match(actions, /updateClientProfileForClient\(userId/);
  assert.doesNotMatch(actions, /client_profile_id|clientProfileId/);
  assert.match(repository, /where\(eq\(clientProfiles\.id, profile\.id\)\)/);
  assert.match(repository, /bio: existing\.bio/);
  assert.match(repository, /addressLine1: existing\.addressLine1/);
  assert.match(onboarding, /upsertClientProfile\(userId/);
  assert.match(leadService, /where\(eq\(clientProfiles\.clerkUserId, clerkUserId\)\)/);
  assert.doesNotMatch(leadService, /update\(clientProfiles\)/);
  assert.doesNotMatch(leadService, /insert\(claims\)/);
});

test("profile sharing rejects unknown fields and keeps avatars and street addresses private", () => {
  assert.equal(profileShareSchema.safeParse({ selectedFields: ["first_name", "bio"], duration: "24h" }).success, true);
  assert.equal(profileShareSchema.safeParse({ selectedFields: ["avatar"], duration: "24h" }).success, false);
  assert.equal(profileShareSchema.safeParse({ selectedFields: ["addressLine1"], duration: "24h" }).success, false);
  assert.equal(profileShareSchema.safeParse({ selectedFields: ["first_name"], duration: "forever" }).success, false);
  const form = fs.readFileSync(path.resolve("src/components/account/client-profile-form.tsx"), "utf8");
  assert.match(form, /Your profile image, address, claims and assessments are never included/);
  assert.doesNotMatch(form, /\["avatar", "Profile photo"\]/);
});

test("profile share service uses opaque 256-bit tokens, hash-only lookup, expiry and owner-scoped revocation", () => {
  const shares = fs.readFileSync(path.resolve("src/lib/clients/shares.ts"), "utf8");
  assert.match(shares, /crypto\.randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(shares, /createHash\("sha256"\)/);
  assert.match(shares, /tokenHash: tokenHash\(token\)/);
  assert.match(shares, /"1h": 60 \* 60_000/);
  assert.match(shares, /"24h": 24 \* 60 \* 60_000/);
  assert.match(shares, /"7d": 7 \* 24 \* 60 \* 60_000/);
  assert.match(shares, /gt\(clientProfileShares\.expiresAt, new Date\(\)\)/);
  assert.match(shares, /isNull\(clientProfileShares\.revokedAt\)/);
  assert.match(shares, /eq\(clientProfileShares\.clientProfileId, profile\.id\)/);
  assert.doesNotMatch(shares, /token: clientProfileShares/);
  assert.doesNotMatch(shares, /clerkUserId.*return/);
});

test("profile completion has four deterministic sections and does not require optional bio or avatar", () => {
  const repository = fs.readFileSync(path.resolve("src/lib/clients/repository.ts"), "utf8");
  assert.match(repository, /total: 4/);
  assert.match(repository, /Boolean\(profile\.firstName && profile\.lastName\)/);
  assert.match(repository, /Boolean\(profile\.phone\)/);
  assert.match(repository, /Boolean\(profile\.city \|\| profile\.addressLine1\)/);
  assert.doesNotMatch(repository, /profile\.bio|profile\.image/);
});

test("public profile shares have a strict allow-list and noindex boundary", () => {
  const page = fs.readFileSync(path.resolve("src/app/profile/share/[token]/page.tsx"), "utf8");
  const sitemap = fs.readFileSync(path.resolve("src/app/sitemap.ts"), "utf8");
  assert.match(page, /robots: \{ index: false, follow: false \}/);
  for (const field of ["first_name", "last_name", "bio", "phone", "city_region"]) assert.match(page, new RegExp(`fields\\.has\\("${field}"\\)`));
  assert.doesNotMatch(page, /addressLine|postcode|claim|assessment|clerkUserId|clientProfileId/);
  assert.doesNotMatch(sitemap, /profile\/share/);
});

test("share actions derive owner authority from Clerk and do not expose token hashes", () => {
  const actions = fs.readFileSync(path.resolve("src/app/account/profile/share-actions.ts"), "utf8");
  assert.match(actions, /const \{ userId \} = await auth\(\)/);
  assert.match(actions, /createProfileShare\(userId/);
  assert.match(actions, /revokeProfileShare\(userId, shareReference\)/);
  assert.doesNotMatch(actions, /tokenHash|clientProfileId|clerkUserId/);
});

const preAccountAssessment = { version: 1 as const, status: "complete" as const, currentStepId: "review", answers: { jurisdiction: "custom", custom_location: "Newcastle-under-Lyme" }, outcomeId: "REVIEW_RECOMMENDED" as const, startedAt: null };
const preAccountInput = { firstName: "Renter", email: "renter@example.com", phone: "07700 900123", serviceContactConsent: "yes" as const, associationKey: "123456789012345678901234", assessment: preAccountAssessment };
test("pre-account capture requires email, phone and service consent while marketing defaults off", () => { const parsed = preAccountAssessmentCaptureSchema.parse(preAccountInput); assert.equal(parsed.email, "renter@example.com"); assert.equal(parsed.phone, "+447700900123"); assert.equal(parsed.marketingConsent, false); assert.throws(() => preAccountAssessmentCaptureSchema.parse({ ...preAccountInput, phone: "" })); assert.throws(() => preAccountAssessmentCaptureSchema.parse({ ...preAccountInput, serviceContactConsent: undefined })); });
test("pre-account capture rejects malformed contact data and incomplete assessments", () => { assert.throws(() => preAccountAssessmentCaptureSchema.parse({ ...preAccountInput, email: "invalid" })); assert.throws(() => preAccountAssessmentCaptureSchema.parse({ ...preAccountInput, phone: "123" })); assert.throws(() => preAccountAssessmentCaptureSchema.parse({ ...preAccountInput, assessment: { ...preAccountAssessment, status: "review" } })); });
test("pre-account persistence derives outcome and keeps durable assessment separate from handoff", () => { const service = fs.readFileSync(path.resolve("src/lib/leads/service.ts"), "utf8"); const schema = fs.readFileSync(path.resolve("src/lib/db/schema/leads.ts"), "utf8"); assert.match(service, /buildAssessmentOutcome\(assessment\.answers\)/); assert.match(service, /preAccountEligibilityAssessments/); assert.match(service, /db\.transaction/); assert.match(schema, /pre_account_eligibility_assessments/); assert.match(schema, /leadId:.*unique/); });
test("pre-account conversion uses authenticated identity and durable snapshot", () => { const service = fs.readFileSync(path.resolve("src/lib/leads/service.ts"), "utf8"); assert.match(service, /clientProfiles\.clerkUserId, clerkUserId/); assert.match(service, /row\.preAccount/); assert.match(service, /convertedClientProfileId/); assert.match(service, /convertedAssessmentId/); assert.match(service, /convertedAt/); assert.doesNotMatch(service, /where\(eq\(clientProfiles\.email/); });
test("pre-account records are not exposed through the authenticated client assessment repository", () => { const repository = fs.readFileSync(path.resolve("src/lib/eligibility/persistence/repository.ts"), "utf8"); assert.match(repository, /eligibilityAssessments\.clientProfileId/); assert.doesNotMatch(repository, /preAccountEligibilityAssessments/); });
test("pre-account admin visibility is planned around safe references and no raw identifiers", () => { const verifier = fs.readFileSync(path.resolve("scripts/verify-db.mjs"), "utf8"); const admin = fs.readFileSync(path.resolve("src/app/admin/assessments/page.tsx"), "utf8"); assert.match(verifier, /pre_account_eligibility_assessments/); assert.match(admin, /metadata.*robots/); assert.doesNotMatch(admin, /clerkUserId|clientProfileId/); });
test("pre-account persistence never creates a client or claim", () => { const service = fs.readFileSync(path.resolve("src/lib/leads/service.ts"), "utf8"); assert.doesNotMatch(service, /insert\(clientProfiles\)/); assert.doesNotMatch(service, /insert\(claims\)/); assert.match(service, /insert\(preAccountEligibilityAssessments\)/); });
