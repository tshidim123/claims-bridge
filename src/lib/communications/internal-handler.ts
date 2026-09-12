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

async function hasEmptyBody(request: Request): Promise<boolean> {
  const length = request.headers.get("content-length");
  if (length !== null && !/^0+$/.test(length.trim())) return false;
  if (!request.body) return true;

  // Next may supply a stream even for a zero-byte POST. Never buffer or parse it:
  // reject the first byte, and bound both waiting and zero-length stream chunks.
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    reader = request.body.getReader();
    const bodyReader = reader;
    return await Promise.race([
      (async () => {
        for (let reads = 0; reads < 16; reads++) {
          const { done, value } = await bodyReader.read();
          if (done) return true;
          if (value.byteLength > 0) return false;
        }
        return false;
      })(),
      new Promise<false>((resolve) => {
        timer = setTimeout(() => resolve(false), 1000);
      }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    // Cancellation must not extend the deadline if the underlying source stalls.
    void reader?.cancel().catch(() => {});
    reader?.releaseLock();
  }
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
  if (new URL(request.url).search || !(await hasEmptyBody(request)))
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
