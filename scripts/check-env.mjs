import nextEnv from "@next/env";
import { evaluateCommunicationConfiguration, evaluateWorkerConfiguration } from "../src/lib/communications/config.ts";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd(), true);

const productionMode = process.argv.includes("--production");

const core = [
  ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", (value) => value.startsWith("pk_")],
  ["CLERK_SECRET_KEY", (value) => value.startsWith("sk_")],
  ["DATABASE_URL", (value) => /^postgres(ql)?:\/\//i.test(value)],
];
const isProductionUrl = (value) => { try { const url = new URL(value); return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname); } catch { return false; } };
const optionalStorage = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
let failed = false;
for (const [name, format] of core) {
  const value = process.env[name]; const valid = Boolean(value && format(value));
  console.log(`${name}: ${valid ? "configured" : "missing or invalid"}`);
  if (!valid) failed = true;
}
const canonicalUrlConfigured = Boolean(process.env.NEXT_PUBLIC_SITE_URL && isProductionUrl(process.env.NEXT_PUBLIC_SITE_URL));
console.log(`NEXT_PUBLIC_SITE_URL: ${canonicalUrlConfigured ? "configured" : productionMode ? "missing or invalid" : "optional in development"}`);
if (productionMode && !canonicalUrlConfigured) failed = true;
const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const secretKey = process.env.CLERK_SECRET_KEY;
const clerkMode = publishableKey?.startsWith("pk_test_") && secretKey?.startsWith("sk_test_")
  ? "development"
  : publishableKey?.startsWith("pk_live_") && secretKey?.startsWith("sk_live_")
    ? "production"
    : "configured / unrecognised pairing";
console.log(`Clerk key mode: ${clerkMode}`);
if (productionMode && clerkMode !== "production") failed = true;
const storageCount = optionalStorage.filter((name) => Boolean(process.env[name])).length;
console.log(`R2 document storage: ${storageCount === 0 ? "optional / not configured" : storageCount === optionalStorage.length ? "configured" : "incomplete configuration"}`);
if (storageCount > 0 && storageCount < optionalStorage.length) failed = true;
const bootstrapId = process.env.STAFF_BOOTSTRAP_CLERK_USER_ID || process.env.BOOTSTRAP_SUPER_ADMIN_CLERK_USER_ID;
console.log(`Staff bootstrap identity: ${bootstrapId ? "configured for controlled bootstrap" : "not configured (not required after bootstrap)"}`);
const communicationEnvironment = productionMode ? { ...process.env, NODE_ENV: "production" } : process.env;
const communications = evaluateCommunicationConfiguration(communicationEnvironment);
const worker = evaluateWorkerConfiguration(communicationEnvironment);
for (const [label, configured] of [
  ["Transactional provider", communications.provider],
  ["Sender", communications.sender],
  ["Reply-to", communications.replyTo],
  ["Webhook", communications.webhook],
  ["Queue automation authorization", worker.automation],
  ["Email canonical site", worker.canonicalSite],
]) console.log(`${label}: ${configured ? "configured" : "not configured"}`);
console.log(`Development send policy: ${worker.developmentSending ? "production delivery or explicit allowlist" : "blocked (no allowlist)"}`);
console.log("Scheduler activation: requires the repository workflow and environment configuration; not verified by this check.");
process.exitCode = failed ? 1 : 0;
