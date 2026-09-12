import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hasPermissionForRole, staffRoles } from "../src/config/staff";
import {
  manualCommunicationSchema,
  canRemindStartClaim,
  manualDestination,
  manualSubject,
} from "../src/lib/communications/manual-policy";
import { renderCommunicationEmail } from "../src/lib/communications/email";
import { previewInput } from "../src/lib/communications/preview";
import { buildAssessmentOutcome } from "../src/lib/eligibility/outcome";
import { sanitizeAuditMetadata } from "../src/lib/staff/audit";

const base = {
  preset: "GENERAL_SERVICE_UPDATE",
  requestId: randomUUID(),
  clientReference: "CB-CLT-ABCD1234",
  title: "Service update",
  body: "Our service desk hours have changed.",
  nextStep: "View your account for your current claim information.",
};
test("manual communications require the central admin permission", () => {
  for (const role of staffRoles)
    assert.equal(
      hasPermissionForRole(role, "COMMUNICATIONS_SEND"),
      ["ADMIN", "SUPER_ADMIN"].includes(role),
    );
});
test("manual targeting accepts references only and rejects recipient injection and external CTA input", () => {
  assert.ok(manualCommunicationSchema.safeParse(base).success);
  for (const injected of [
    { email: "victim@example.test" },
    { recipientReference: "someone" },
    { destination: "https://evil.test" },
    { clientReference: "user_clerk_id" },
    { clientReference: "../../account" },
    { requestId: "repeat" },
  ])
    assert.equal(
      manualCommunicationSchema.safeParse({ ...base, ...injected }).success,
      false,
    );
});
test("manual content is bounded plain text with no markup, header injection or links", () => {
  for (const injected of [
    { title: "x\r\nBcc: other@example.test" },
    { title: "x".repeat(121) },
    { body: "<script>alert(1)</script>" },
    { body: "Click https://evil.test" },
    { body: "hello\u0000" },
    { body: "a".repeat(2001) },
    { nextStep: "a".repeat(301) },
  ])
    assert.equal(
      manualCommunicationSchema.safeParse({ ...base, ...injected }).success,
      false,
    );
  assert.ok(
    manualCommunicationSchema.safeParse({
      ...base,
      body: "First paragraph.\n\nSecond paragraph.",
    }).success,
  );
});
test("manual domain presets require their real context and valid due dates", () => {
  const input = {
    preset: "REQUEST_DOCUMENTS",
    clientReference: base.clientReference,
    claimReference: "CB-CLM-2026-ABCD1234",
    requestId: randomUUID(),
    evidenceType: "TENANCY_AGREEMENT",
  };
  assert.ok(manualCommunicationSchema.safeParse(input).success);
  for (const injected of [
    { claimReference: undefined },
    { evidenceType: undefined },
    { dueDate: "2026-02-30" },
  ])
    assert.equal(
      manualCommunicationSchema.safeParse({ ...input, ...injected }).success,
      false,
    );
  assert.ok(
    manualCommunicationSchema.safeParse({ ...input, dueDate: "2026-10-15" })
      .success,
  );
  assert.equal(
    manualCommunicationSchema.safeParse({
      preset: "NEXT_STEPS",
      requestId: randomUUID(),
      clientReference: base.clientReference,
    }).success,
    false,
  );
});
test("Start Claim reminders exclude drafts, missing completion, existing claims and unsupported routes", () => {
  const assessment = {
    status: "COMPLETE",
    completed: true,
    outcome: "REVIEW_RECOMMENDED",
  };
  assert.equal(canRemindStartClaim(assessment, false), true);
  assert.equal(canRemindStartClaim(assessment, true), false);
  for (const changed of [
    { status: "DRAFT" },
    { completed: false },
    { outcome: "OUTSIDE_CURRENT_SCOPE" },
    { outcome: "NO_DEPOSIT_PATH" },
  ])
    assert.equal(
      canRemindStartClaim({ ...assessment, ...changed }, false),
      false,
    );
});
test("manual subject and destination preview use the same controlled policy as sending", () => {
  const input = manualCommunicationSchema.parse({
    ...base,
    preset: "START_CLAIM_REMINDER",
    assessmentReference: "CB-ASM-ABCD1234",
  });
  assert.equal(
    manualDestination(input),
    "/account/assessments/CB-ASM-ABCD1234",
  );
  assert.match(manualSubject(input), /saved assessment/);
});
test("manual audit allows safe event references and drops recipient, payload, identity and message fields", () => {
  const output = sanitizeAuditMetadata({
    communicationPreset: "NEXT_STEPS",
    communicationEvent: "CLIENT_ACTION_REQUIRED",
    emailReference: "CB-EML-ABCD1234",
    communicationReference: "CB-COM-1234",
    recipientEmail: "private@example.test",
    body: "PRIVATE",
    clerkUserId: "PRIVATE",
    clientProfileId: "PRIVATE",
    providerResponse: "PRIVATE",
  });
  assert.deepEqual(Object.keys(output!).sort(), [
    "communicationEvent",
    "communicationPreset",
    "communicationReference",
    "emailReference",
  ]);
});
test("campaign receipt renders canonical assessment evidence and the complete account journey", async () => {
  const outcome = buildAssessmentOutcome({
    jurisdiction: "england",
    deposit_paid: "yes",
    protected_told: "no",
    tenancy_party: "agent",
  });
  const rendered = await renderCommunicationEmail({
    event: "ASSESSMENT_RECEIVED",
    payload: {
      assessmentReference: "CB-ASM-ABCD1234",
      outcome: outcome.headline,
      explanation: outcome.explanation,
      evidence: outcome.evidence,
      continuationUrl: "/account/assessment",
    },
  });
  for (const item of outcome.evidence) {
    assert.ok(rendered.html.includes(item.label));
    assert.ok(rendered.text.includes(item.label));
  }
  for (const format of [rendered.html, rendered.text]) {
    assert.match(format, /START MY CLAIM/);
    assert.match(format, /linked securely/);
    assert.match(format, /separate confirmation/);
    assert.ok(format.includes(outcome.headline));
  }
});
test("document requests are truthful before secure uploads are available and omit invented deadlines", async () => {
  const rendered = await renderCommunicationEmail(
    previewInput("EVIDENCE_REQUESTED", "no-due-date"),
  );
  for (const format of [rendered.html, rendered.text]) {
    assert.match(format, /Secure uploads are not yet available/);
    assert.doesNotMatch(format, /Due date:/);
  }
});
test("service update renderer escapes text and canonicalizes a hostile destination", async () => {
  const result = await renderCommunicationEmail({
    event: "GENERAL_SERVICE_UPDATE",
    payload: {
      reference: base.clientReference,
      title: "Service & support",
      body: "<script>private</script>",
      nextStep: "Review your account",
      destination: "https://evil.test",
      cta: "OPEN MY ACCOUNT",
    },
  });
  assert.doesNotMatch(result.html, /<script>|evil\.test/);
  assert.match(result.html, /&lt;script&gt;/);
});
