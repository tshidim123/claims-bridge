import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Webhook } from "svix";
import { communicationEvents } from "../src/lib/communications/registry";
import {
  communicationPreviewEnabled,
  previewEvents,
  previewInput,
  previewScenarios,
  isolatedPreviewHtml,
} from "../src/lib/communications/preview";
import {
  normalizeMailbox,
  developmentRecipientAllowed,
  evaluateCommunicationConfiguration,
  evaluateWorkerConfiguration,
  emailDestination,
} from "../src/lib/communications/config";
import { renderCommunicationEmail } from "../src/lib/communications/email";
import { verifiedRecipient } from "../src/lib/communications/recipients";
import {
  sendProviderRequest,
  type ProviderRequest,
} from "../src/lib/communications/provider";
import { handleProcessorRequest } from "../src/lib/communications/internal-handler";
import { handleResendWebhook } from "../src/lib/communications/webhook-handler";
import {
  boundedBatchSize,
  recoveryFailure,
  deliveryTransition,
  workerLimits,
} from "../src/lib/communications/worker-policy";
import {
  runEmailBatch,
  type WorkerDependencies,
} from "../src/lib/communications/worker";
import {
  assessmentEmailMessage,
  assessmentEmailState,
} from "../src/lib/communications/assessment-receipt";
import {
  canManuallyRetry,
  receiptLabel,
} from "../src/lib/communications/policy";

const env = {
  NODE_ENV: "development",
  RESEND_API_KEY: "fabricated-provider-secret",
  NEXT_PUBLIC_SITE_URL: "https://example.test",
  CLAIMS_BRIDGE_FROM_EMAIL: "Claims Bridge <service@example.test>",
  COMMUNICATIONS_DEV_RECIPIENT_ALLOWLIST: "developer@example.test",
};
const message: ProviderRequest = {
  from: env.CLAIMS_BRIDGE_FROM_EMAIL,
  to: ["developer@example.test"],
  subject: "Claims Bridge test",
  html: "<p>Secure update</p>",
  text: "Secure update",
};
const providerId = "8a0b04e6-87a0-4cd6-a253-2c4f67fe2342";
const secret = "fabricated-cron-secret-with-at-least-32-characters";
const reference = "CB-EML-ABCD1234";

test("preview is local-development only, including production-mode and Vercel preview builds", async () => {
  assert.equal(communicationPreviewEnabled({ NODE_ENV: "development" }), true);
  for (const configuration of [
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { NODE_ENV: "development", VERCEL_ENV: "preview" },
    { NODE_ENV: "production", VERCEL_ENV: "production" },
  ])
    assert.equal(communicationPreviewEnabled(configuration), false);
  const { default: page } = await import("../src/app/dev/communications/page");
  const previous = process.env.NODE_ENV;
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    await assert.rejects(
      () => page({ searchParams: Promise.resolve({}) }),
      /NEXT_HTTP_ERROR_FALLBACK;404/,
    );
    Object.assign(process.env, { NODE_ENV: "development" });
    assert.ok(
      await page({ searchParams: Promise.resolve({ event: "WELCOME" }) }),
    );
  } finally {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Object.assign(process.env, { NODE_ENV: previous });
  }
});

test("all canonical event templates render real HTML and meaningful text in all preview scenarios", async () => {
  assert.deepEqual(previewEvents, Object.keys(communicationEvents));
  for (const event of previewEvents)
    for (const scenario of previewScenarios) {
      const result = await renderCommunicationEmail(
        previewInput(event, scenario),
      );
      assert.ok(result.subject.length > 8, event);
      assert.ok(result.preheader.length > 8, event);
      assert.ok(result.text.length > 80, event);
      assert.match(result.html, /Claims Bridge/);
      assert.match(result.text, /https?:\/\//);
      assert.doesNotMatch(
        result.html + result.text,
        /\b(?:undefined|null)\b|clerkUserId|storageKey|internalNote|ASSESSMENT_RECEIVED|HIGH_PRIORITY_CLAIM/,
      );
      if (scenario === "no-due-date")
        assert.doesNotMatch(result.html + result.text, /Due date:/);
      assert.match(isolatedPreviewHtml(result.html, true), /img-src 'none'/);
    }
});

test("renderer escapes hostile text and secure-message emails ignore private extra fields", async () => {
  const rendered = await renderCommunicationEmail({
    event: "WELCOME",
    payload: { firstName: '<script>alert("x")</script>' },
  });
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /&lt;script&gt;/);
  const payload = {
    claimReference: "CB-CLM-DEMO2026",
    messageBody: "SECRET_MESSAGE",
    storageKey: "SECRET_STORAGE",
    internalNote: "SECRET_NOTE",
    clerkUserId: "SECRET_IDENTITY",
  };
  const secure = await renderCommunicationEmail({
    event: "NEW_SECURE_MESSAGE",
    payload,
  });
  assert.doesNotMatch(secure.html + secure.text, /SECRET_/);
  const staffInput = previewInput("CLIENT_MESSAGE_RECEIVED");
  assert.equal(staffInput.event, "CLIENT_MESSAGE_RECEIVED");
  if (staffInput.event !== "CLIENT_MESSAGE_RECEIVED")
    assert.fail("Wrong staff fixture");
  const staff = await renderCommunicationEmail({
    ...staffInput,
    payload: { ...staffInput.payload, ...payload },
  });
  assert.doesNotMatch(staff.html + staff.text, /SECRET_/);
});

test("canonical destinations reject external, protocol-relative and injected auth continuations", () => {
  for (const path of [
    "https://evil.test",
    "//evil.test",
    "\\evil.test",
    "javascript:alert(1)",
    "/sign-in?redirect_url=https%3A%2F%2Fevil.test",
    "/sign-in?redirect_url=%2F%2Fevil.test",
    "/account\r\nX: injected",
  ])
    assert.equal(
      emailDestination(path, "/account", env),
      "https://example.test/account",
    );
  assert.equal(
    emailDestination("/account/claims/CB-CLM-DEMO2026", "/account", env),
    "https://example.test/account/claims/CB-CLM-DEMO2026",
  );
  assert.equal(
    evaluateWorkerConfiguration({
      ...env,
      NODE_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    }).canProcess,
    false,
  );
});

test("mailbox and provider guards reject recipient/header injection without a provider call", async () => {
  let calls = 0;
  const transport: typeof fetch = async () => {
    calls++;
    return Response.json({ id: providerId });
  };
  for (const address of [
    "\r\nbcc: victim@example.test",
    "a@example.test,b@example.test",
    "a@example.test\r\n",
    "a@example.test\u0000",
    "a",
    "Display <a@example.test>",
  ])
    assert.equal(normalizeMailbox(address), undefined);
  assert.deepEqual(
    await sendProviderRequest(
      reference,
      { ...message, subject: "Hello\r\nBcc: someone@example.test" },
      env,
      transport,
    ),
    { kind: "permanent", code: "INVALID_EMAIL_REQUEST" },
  );
  assert.equal(calls, 0);
});

test("development guard has no implicit opt-in, wildcard or silent rerouting", async () => {
  assert.equal(developmentRecipientAllowed("client@example.test", env), false);
  assert.equal(
    developmentRecipientAllowed("Developer@Example.Test", env),
    true,
  );
  assert.equal(
    developmentRecipientAllowed("client@example.test", {
      ...env,
      COMMUNICATIONS_DEV_RECIPIENT_ALLOWLIST: "*",
    }),
    false,
  );
  assert.equal(
    developmentRecipientAllowed("client@example.test", {
      ...env,
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
    }),
    false,
  );
  assert.equal(
    developmentRecipientAllowed("client@example.test", {
      ...env,
      NODE_ENV: "production",
    }),
    false,
  );
  assert.equal(
    developmentRecipientAllowed("client@example.test", {
      ...env,
      NODE_ENV: "production",
      VERCEL_ENV: "production",
    }),
    true,
  );
  const blocked = await sendProviderRequest(
    reference,
    { ...message, to: ["client@example.test"] },
    env,
    async () => {
      throw new Error("Must not call provider");
    },
  );
  assert.deepEqual(blocked, {
    kind: "permanent",
    code: "DEVELOPMENT_RECIPIENT_BLOCKED",
  });
  assert.equal(
    evaluateWorkerConfiguration({
      ...env,
      COMMUNICATIONS_DEV_RECIPIENT_ALLOWLIST: "",
    }).canProcess,
    false,
  );
});

test("provider acceptance retains a stable idempotency key and exact request across retries", async () => {
  const requests: RequestInit[] = [];
  const transport: typeof fetch = async (_, options) => {
    requests.push(options!);
    return Response.json({
      id: providerId,
      ignored: "PRIVATE_PROVIDER_METADATA",
    });
  };
  for (let index = 0; index < 2; index++)
    assert.deepEqual(
      await sendProviderRequest(reference, message, env, transport),
      { kind: "sent", id: providerId },
    );
  assert.equal(
    new Headers(requests[0].headers).get("Idempotency-Key"),
    reference,
  );
  assert.equal(requests[0].body, requests[1].body);
  assert.equal(requests[0].redirect, "error");
  assert.ok(requests[0].signal);
});

test("provider transient, permanent and malformed responses are safely classified", async () => {
  for (const status of [408, 409, 429, 500, 503])
    assert.deepEqual(
      await sendProviderRequest(
        reference,
        message,
        env,
        async () => new Response("secret raw response", { status }),
      ),
      { kind: "temporary", code: `RESEND_${status}` },
    );
  for (const status of [400, 401, 403, 422])
    assert.deepEqual(
      await sendProviderRequest(
        reference,
        message,
        env,
        async () => new Response("secret raw response", { status }),
      ),
      { kind: "permanent", code: `RESEND_${status}` },
    );
  assert.deepEqual(
    await sendProviderRequest(reference, message, env, async () =>
      Response.json({ unexpected: "PRIVATE_RESPONSE" }),
    ),
    { kind: "temporary", code: "INVALID_PROVIDER_RESPONSE" },
  );
  assert.deepEqual(
    await sendProviderRequest(reference, message, env, async () => {
      throw new Error("PRIVATE_NETWORK_DETAIL");
    }),
    { kind: "temporary", code: "PROVIDER_TEMPORARY_FAILURE" },
  );
});

test("verified recipient resolution follows current verified primary identity and safe fallback", () => {
  const user = {
    primaryEmailAddressId: "new",
    emailAddresses: [
      {
        id: "old",
        emailAddress: "old@example.test",
        verification: { status: "verified" },
      },
      {
        id: "new",
        emailAddress: "new@example.test",
        verification: { status: "verified" },
      },
    ],
  };
  assert.deepEqual(verifiedRecipient(user), {
    ok: true,
    email: "new@example.test",
    source: "CLERK_PRIMARY_VERIFIED",
  });
  user.emailAddresses[1].verification.status = "unverified";
  assert.deepEqual(verifiedRecipient(user), {
    ok: true,
    email: "old@example.test",
    source: "CLERK_VERIFIED_FALLBACK",
  });
  user.emailAddresses[0].verification.status = "unverified";
  assert.deepEqual(verifiedRecipient(user), {
    ok: false,
    code: "NO_VERIFIED_EMAIL",
    retryable: false,
  });
});

test("queue authorization rejects unauthorized requests and browser-controlled drain parameters", async () => {
  let calls = 0;
  const process = async (size: number) => {
    calls++;
    assert.equal(size, 20);
    return {
      processed: 1,
      accepted: 1,
      attention: 0,
      leaseLost: 0,
      inactive: false,
    };
  };
  for (const headers of [
    new Headers(),
    new Headers({ authorization: "Bearer wrong" }),
  ])
    assert.equal(
      (
        await handleProcessorRequest(
          new Request(
            "https://example.test/api/internal/communications/process",
            { method: "POST", headers },
          ),
          process,
          secret,
        )
      ).status,
      401,
    );
  assert.equal(calls, 0);
  const request = (suffix = "", body?: string) =>
    new Request(
      `https://example.test/api/internal/communications/process${suffix}`,
      { method: "POST", headers: { authorization: `Bearer ${secret}` }, body },
    );
  assert.equal(
    (await handleProcessorRequest(request("?batch=10000"), process, secret))
      .status,
    400,
  );
  assert.equal(
    (
      await handleProcessorRequest(
        request("", '{"recipient":"victim@example.test"}'),
        process,
        secret,
      )
    ).status,
    400,
  );
  assert.equal(
    (await handleProcessorRequest(request(), process, secret)).status,
    200,
  );
  assert.equal(calls, 1);
});

test("processor error responses never expose secrets and inactive delivery is truthful", async () => {
  const request = () =>
    new Request("https://example.test/api/internal/communications/process", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
  const failure = await handleProcessorRequest(
    request(),
    async () => {
      throw new Error("postgres://SECRET_BODY");
    },
    secret,
  );
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /SECRET|postgres|Bearer/);
  const inactive = await handleProcessorRequest(
    request(),
    async () => ({
      processed: 0,
      accepted: 0,
      attention: 0,
      leaseLost: 0,
      inactive: true,
    }),
    secret,
  );
  assert.equal(inactive.status, 503);
});

test("bounded batches, inactive policy and invocation deadlines stop queue draining", async () => {
  let claims = 0;
  let time = 0;
  const dependencies: WorkerDependencies<number> = {
    enabled: () => true,
    now: () => new Date(time),
    claim: async () => ++claims,
    deliver: async () => ({ kind: "sent", id: providerId }),
    finish: async () => true,
  };
  assert.equal((await runEmailBatch(dependencies, 10000)).processed, 20);
  assert.equal(boundedBatchSize(Number.NaN), 20);
  assert.equal(boundedBatchSize(-2), 1);
  claims = 0;
  await runEmailBatch({ ...dependencies, enabled: () => false });
  assert.equal(claims, 0);
  const limited = await runEmailBatch({
    ...dependencies,
    deliver: async () => {
      time += 25000;
      return { kind: "sent", id: providerId };
    },
  });
  assert.equal(limited.processed, 1);
});

test("worker catches delivery failures and reports lost leases without claiming success", async () => {
  let finishedCode = "";
  const dependencies: WorkerDependencies<number> = {
    enabled: () => true,
    now: () => new Date(),
    claim: async () => 1,
    deliver: async () => {
      throw new Error("PRIVATE_DETAILS");
    },
    finish: async (_, result) => {
      if (result.kind !== "sent") finishedCode = result.code;
      return false;
    },
  };
  const result = await runEmailBatch(dependencies, 1);
  assert.equal(finishedCode, "PROCESSING_TEMPORARY_FAILURE");
  assert.equal(result.processed, 0);
  assert.equal(result.leaseLost, 1);
});

test("recovery and retry stop before idempotency expiration, use backoff and honor the attempt cap", () => {
  const now = new Date();
  const record = {
    status: "PROCESSING",
    attemptCount: "1",
    providerRequest: message,
    providerFirstAttemptAt: new Date(now.getTime() - 10 * 60_000),
  };
  assert.equal(recoveryFailure(record, now), null);
  assert.equal(
    recoveryFailure(
      {
        ...record,
        providerFirstAttemptAt: new Date(
          now.getTime() - workerLimits.idempotencyWindowMs,
        ),
      },
      now,
    ),
    "DELIVERY_UNCERTAIN",
  );
  assert.equal(
    recoveryFailure({ ...record, attemptCount: "5" }, now),
    "RETRY_LIMIT_REACHED",
  );
  assert.equal(
    recoveryFailure(
      { ...record, providerRequest: null, providerFirstAttemptAt: null },
      now,
    ),
    null,
  );
  const transition = deliveryTransition(
    { kind: "temporary", code: "RESEND_503" },
    1,
    now,
  );
  assert.equal(transition.status, "RETRY");
  assert.equal(transition.availableAt!.getTime() - now.getTime(), 120000);
  assert.equal(
    deliveryTransition({ kind: "temporary", code: "RESEND_503" }, 5, now)
      .lastErrorCode,
    "RETRY_LIMIT_REACHED",
  );
  assert.equal(
    deliveryTransition(
      { kind: "permanent", code: "RECIPIENT_SUPPRESSED" },
      1,
      now,
    ).status,
    "FAILED",
  );
  assert.equal(
    canManuallyRetry({
      status: "FAILED",
      attemptCount: "1",
      lastErrorCode: "DELIVERY_UNCERTAIN",
    }),
    false,
  );
  assert.equal(
    canManuallyRetry({
      status: "RETRY",
      attemptCount: "1",
      lastErrorCode: "RESEND_503",
      providerFirstAttemptAt: new Date(Date.now() - 24 * 60 * 60_000),
    }),
    false,
  );
});

const webhookSecret = `whsec_${Buffer.from("fabricated-webhook-signing-secret").toString("base64")}`;
function signedWebhook(
  body: string,
  id = "msg_fabricated_event",
  date = new Date(),
) {
  return new Request("https://example.test/api/webhooks/resend", {
    method: "POST",
    body,
    headers: {
      "svix-id": id,
      "svix-timestamp": String(Math.floor(date.getTime() / 1000)),
      "svix-signature": new Webhook(webhookSecret).sign(id, date, body),
    },
  });
}
const eventBody = JSON.stringify({
  type: "email.delivered",
  created_at: new Date().toISOString(),
  data: { email_id: providerId, to: ["PRIVATE_EMAIL"], html: "PRIVATE_BODY" },
});

test("webhook verifies real Svix signatures, strips private fields and rejects forgery/stale timestamps", async () => {
  let calls = 0;
  const persist = async (_: string, event: unknown) => {
    calls++;
    assert.doesNotMatch(JSON.stringify(event), /PRIVATE_|html|to/);
  };
  assert.equal(
    (
      await handleResendWebhook(
        signedWebhook(eventBody),
        persist,
        webhookSecret,
      )
    ).status,
    200,
  );
  const forged = signedWebhook(eventBody);
  forged.headers.set("svix-signature", "v1,invalid");
  assert.equal(
    (await handleResendWebhook(forged, persist, webhookSecret)).status,
    400,
  );
  assert.equal(
    (
      await handleResendWebhook(
        signedWebhook(eventBody, "msg_old", new Date(Date.now() - 600000)),
        persist,
        webhookSecret,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await handleResendWebhook(
        new Request("https://example.test", {
          method: "POST",
          body: eventBody,
        }),
        persist,
        webhookSecret,
      )
    ).status,
    400,
  );
  assert.equal(calls, 1);
});

test("webhook bounds actual UTF-8 stream bytes and retries persistence failures", async () => {
  assert.equal(
    (
      await handleResendWebhook(
        signedWebhook("😀".repeat(33000)),
        async () => {
          assert.fail("Must not persist oversized data");
        },
        webhookSecret,
      )
    ).status,
    413,
  );
  const unavailable = await handleResendWebhook(
    signedWebhook(eventBody),
    async () => {
      throw new Error("PRIVATE_DATABASE_DETAIL");
    },
    webhookSecret,
  );
  assert.equal(unavailable.status, 503);
  assert.doesNotMatch(await unavailable.text(), /PRIVATE/);
});

test("webhook ledger and suppression are atomic, replay-safe and cannot be undone by later delivered events", () => {
  const source = readFileSync("src/lib/communications/webhook.ts", "utf8");
  assert.match(source, /db\.transaction/);
  assert.match(source, /for\("update"\)/);
  assert.match(
    source,
    /onConflictDoNothing\(\{ target: emailDeliveryEvents\.providerEventId \}\)/,
  );
  assert.match(source, /if \(!stored\.length\) return/);
  assert.match(source, /clearedAt: null/);
  assert.equal(
    receiptLabel("FAILED", "email.delivered", "email.complained"),
    "Suppressed",
  );
  assert.equal(
    receiptLabel("FAILED", "email.delivered", "email.bounced"),
    "Bounced",
  );
});

test("configuration projections disclose no credentials, addresses or connection strings", () => {
  const configuration = {
    ...env,
    RESEND_WEBHOOK_SECRET: "SECRET_WEBHOOK",
    COMMUNICATIONS_CRON_SECRET: secret,
    DATABASE_URL: "postgres://SECRET_DATABASE",
    CLERK_SECRET_KEY: "SECRET_CLERK",
  };
  const projection = JSON.stringify([
    evaluateCommunicationConfiguration(configuration),
    evaluateWorkerConfiguration(configuration),
  ]);
  assert.doesNotMatch(
    projection,
    /SECRET_|fabricated|example.test|postgres|Bearer/,
  );
  assert.equal(evaluateWorkerConfiguration(configuration).automation, true);
});

test("eligibility copy distinguishes saved assessments, failed email, sent and provider-confirmed delivery", () => {
  assert.equal(
    assessmentEmailMessage(assessmentEmailState("PENDING")),
    "We’re sending your confirmation email.",
  );
  assert.equal(
    assessmentEmailMessage(assessmentEmailState("SENT")),
    "Your confirmation email has been sent.",
  );
  assert.equal(assessmentEmailState("SENT", true), "delivered");
  assert.equal(
    assessmentEmailMessage("failed"),
    "Your assessment is safely saved, but we couldn't send your confirmation email yet.",
  );
  assert.equal(assessmentEmailState("FAILED", true), "failed");
});

test("Start Claim preserves saved assessment identity and remains explicit after account continuation", () => {
  const page = readFileSync(
    "src/components/eligibility/eligibility-assessment.tsx",
    "utf8",
  );
  const outcome = readFileSync(
    "src/components/eligibility/eligibility-outcome.tsx",
    "utf8",
  );
  assert.match(page, /if \(savedReference && isSignedIn\)/);
  assert.match(page, /\/account\/onboarding\?lead=/);
  assert.equal((outcome.match(/Start claim\s*<Icon/g) ?? []).length, 1);
  assert.ok(
    outcome.indexOf("Assessment completed") <
      outcome.indexOf("evidencePreview"),
  );
  assert.ok(
    outcome.indexOf("assessmentEmailMessage(emailState)") <
      outcome.indexOf("evidencePreview"),
  );
  const form = readFileSync(
    "src/components/claims/claim-creation-form.tsx",
    "utf8",
  );
  assert.match(form, /type="submit"/);
});
