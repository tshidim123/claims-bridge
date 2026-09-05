type Environment = Record<string, string | undefined>;

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function hasSafeMailbox(value: string | undefined) {
  if (!value?.trim()) return false;
  return !/[\r\n\u0000-\u001f\u007f]/.test(value);
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
