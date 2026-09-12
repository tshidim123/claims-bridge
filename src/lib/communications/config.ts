export type Environment = Record<string, string | undefined>;

export function normalizeMailbox(value: string): string | undefined {
  if (/[\u0000-\u001f\u007f<>(),;:]/.test(value)) return undefined;
  const address = value.trim().toLowerCase();
  return address.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)
    ? address
    : undefined;
}

export function isProductionDelivery(env: Environment) {
  // A local `next start` still uses a Development database. Only the deployment platform opts in.
  return env.NODE_ENV === "production" && env.VERCEL_ENV === "production";
}

export function canonicalEmailOrigin(env: Environment): string | undefined {
  try {
    const url = new URL(env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    const deployedBuild =
      env.NODE_ENV === "production" || Boolean(env.VERCEL_ENV);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/"
    )
      return undefined;
    if (
      url.protocol !== "https:" &&
      !(local && !deployedBuild && url.protocol === "http:")
    )
      return undefined;
    if (deployedBuild && local) return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/** No wildcard, override address or implicit opt-in, including Vercel preview builds. */
export function developmentRecipientAllowed(address: string, env: Environment) {
  const normalized = normalizeMailbox(address);
  if (!normalized) return false;
  if (isProductionDelivery(env)) return true;
  const allowlist = (env.COMMUNICATIONS_DEV_RECIPIENT_ALLOWLIST || "")
    .split(",")
    .filter(Boolean);
  return allowlist.some((entry) => normalizeMailbox(entry) === normalized);
}

export function emailDestination(
  path: string | undefined,
  fallback: string,
  env: Environment,
) {
  const origin = canonicalEmailOrigin(env);
  if (!origin) throw new Error("Canonical email origin unavailable.");
  const safeFallback = new URL(fallback, origin).href;
  if (!path || /[\\\u0000-\u001f\u007f]/.test(path)) return safeFallback;
  try {
    const url = new URL(path, origin);
    if (
      url.origin !== origin ||
      url.username ||
      url.password ||
      path.startsWith("//")
    )
      return safeFallback;
    // Email destinations never accept a browser-supplied off-site auth continuation.
    const redirect = url.searchParams.get("redirect_url");
    if (
      redirect &&
      (!redirect.startsWith("/account") ||
        redirect.startsWith("//") ||
        /[\\\u0000-\u001f]/.test(redirect))
    )
      return safeFallback;
    return url.href;
  } catch {
    return safeFallback;
  }
}

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function hasSafeMailbox(value: string | undefined) {
  if (!value?.trim()) return false;
  if (/[\r\n\u0000-\u001f\u007f]/.test(value)) return false;
  const match = value.match(/^[^<>]+<([^<>]+)>$/);
  return Boolean(normalizeMailbox(match ? match[1] : value));
}

export function evaluateWorkerConfiguration(env: Environment) {
  const delivery = evaluateCommunicationConfiguration(env);
  const canonicalSite = Boolean(canonicalEmailOrigin(env));
  const automation = Boolean(
    env.COMMUNICATIONS_CRON_SECRET &&
    env.COMMUNICATIONS_CRON_SECRET.length >= 32,
  );
  const developmentSending =
    isProductionDelivery(env) ||
    (env.COMMUNICATIONS_DEV_RECIPIENT_ALLOWLIST || "")
      .split(",")
      .some((entry) => Boolean(normalizeMailbox(entry)));
  return {
    canonicalSite,
    automation,
    developmentSending,
    canProcess: delivery.deliveryActive && canonicalSite && developmentSending,
  } as const;
}

/** A presence-only, secret-safe view of transactional email configuration. */
export function evaluateCommunicationConfiguration(env: Environment) {
  const provider = hasValue(env.RESEND_API_KEY);
  const sender = hasSafeMailbox(env.CLAIMS_BRIDGE_FROM_EMAIL);
  const replyTo = hasSafeMailbox(env.CLAIMS_BRIDGE_REPLY_TO_EMAIL);
  const webhook = hasValue(env.RESEND_WEBHOOK_SECRET);

  return {
    provider,
    sender,
    replyTo,
    webhook,
    deliveryActive: provider && sender,
    deliveryTrackingActive: webhook,
  } as const;
}
