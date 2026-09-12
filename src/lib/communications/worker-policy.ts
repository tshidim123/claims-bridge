import { maxDeliveryAttempts, providerIdempotencyWindowMs } from "./policy";

export const workerLimits = {
  batchSize: 20,
  durationMs: 40_000,
  minimumRemainingMs: 18_000,
  leaseMs: 5 * 60_000,
  providerTimeoutMs: 8_000,
  // Resend retains keys for 24 hours. Leave a safety margin; never risk a duplicate after expiry.
  idempotencyWindowMs: providerIdempotencyWindowMs,
} as const;

export type DeliveryResult =
  | { kind: "sent"; id: string }
  | { kind: "temporary" | "permanent"; code: string };

export function boundedBatchSize(requested: number = workerLimits.batchSize) {
  return Number.isFinite(requested)
    ? Math.max(1, Math.min(workerLimits.batchSize, Math.floor(requested)))
    : workerLimits.batchSize;
}

export function recoveryFailure(
  record: {
    attemptCount: string;
    providerFirstAttemptAt: Date | null;
    providerRequest: unknown;
    processingStartedAt?: Date | null;
    status: string;
  },
  now: Date,
) {
  const attempts = Number(record.attemptCount);
  if (
    !Number.isInteger(attempts) ||
    attempts < 0 ||
    attempts >= maxDeliveryAttempts
  )
    return "RETRY_LIMIT_REACHED";
  if (
    record.providerFirstAttemptAt &&
    now.getTime() - record.providerFirstAttemptAt.getTime() >=
      workerLimits.idempotencyWindowMs
  )
    return "DELIVERY_UNCERTAIN";
  if (record.providerFirstAttemptAt && !record.providerRequest)
    return "DELIVERY_UNCERTAIN";
  return null;
}

export function deliveryTransition(
  result: DeliveryResult,
  attempts: number,
  now: Date,
) {
  if (result.kind === "sent")
    return {
      status: "SENT",
      sentAt: now,
      providerMessageId: result.id,
      failedAt: null,
      lastErrorCode: null,
      processingStartedAt: null,
      updatedAt: now,
    };
  const exhausted = attempts >= maxDeliveryAttempts;
  const failed = result.kind === "permanent" || exhausted;
  return {
    status: failed ? "FAILED" : "RETRY",
    availableAt: new Date(
      now.getTime() + Math.min(3_600_000, 2 ** attempts * 60_000),
    ),
    failedAt: failed ? now : null,
    lastErrorCode:
      exhausted && result.kind === "temporary"
        ? "RETRY_LIMIT_REACHED"
        : result.code,
    processingStartedAt: null,
    updatedAt: now,
  };
}
