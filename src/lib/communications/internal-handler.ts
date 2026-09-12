import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { workerLimits } from "./worker-policy";

export function authorizedProcessorRequest(
  request: Request,
  secret: string | undefined,
) {
  if (!secret || secret.length < 32) return false;
  const supplied = request.headers.get("authorization") ?? "";
  if (supplied.length > 1024) return false;
  return timingSafeEqual(
    createHash("sha256").update(supplied).digest(),
    createHash("sha256").update(`Bearer ${secret}`).digest(),
  );
}

export async function handleProcessorRequest(
  request: Request,
  processBatch: (
    batchSize: number,
  ) => Promise<{
    processed: number;
    accepted: number;
    attention: number;
    leaseLost: number;
    inactive: boolean;
  }>,
  secret = process.env.COMMUNICATIONS_CRON_SECRET,
) {
  const headers = { "Cache-Control": "no-store" };
  if (!authorizedProcessorRequest(request, secret))
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  if (request.method !== "POST")
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers },
    );
  if (new URL(request.url).search || request.body !== null)
    return Response.json(
      { error: "No parameters accepted" },
      { status: 400, headers },
    );
  try {
    const result = await processBatch(workerLimits.batchSize);
    return Response.json(result, {
      status: result.inactive ? 503 : 200,
      headers,
    });
  } catch {
    return Response.json(
      { error: "Queue temporarily unavailable" },
      { status: 503, headers },
    );
  }
}
