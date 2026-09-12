import {
  boundedBatchSize,
  workerLimits,
  type DeliveryResult,
} from "./worker-policy";

export interface WorkerDependencies<Row> {
  enabled(): boolean;
  now(): Date;
  claim(now: Date): Promise<Row | null>;
  deliver(row: Row): Promise<DeliveryResult>;
  finish(row: Row, result: DeliveryResult, now: Date): Promise<boolean>;
}

/** Finite sequential batch, with headroom for a bounded identity/provider request. */
export async function runEmailBatch<Row>(
  dependencies: WorkerDependencies<Row>,
  requested?: number,
) {
  const summary = {
    processed: 0,
    accepted: 0,
    attention: 0,
    leaseLost: 0,
    inactive: !dependencies.enabled(),
  };
  if (summary.inactive) return summary;
  const deadline = dependencies.now().getTime() + workerLimits.durationMs;
  for (let index = 0; index < boundedBatchSize(requested); index++) {
    if (
      deadline - dependencies.now().getTime() <
      workerLimits.minimumRemainingMs
    )
      break;
    const row = await dependencies.claim(dependencies.now());
    if (!row) break;
    let result: DeliveryResult;
    try {
      result = await dependencies.deliver(row);
    } catch {
      // No raw errors, payloads, addresses or credentials escape the worker.
      result = { kind: "temporary", code: "PROCESSING_TEMPORARY_FAILURE" };
    }
    if (!(await dependencies.finish(row, result, dependencies.now()))) {
      summary.leaseLost++;
      continue;
    }
    summary.processed++;
    if (result.kind === "sent") summary.accepted++;
    else summary.attention++;
  }
  return summary;
}
