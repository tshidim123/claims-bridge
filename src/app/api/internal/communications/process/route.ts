import { handleProcessorRequest } from "@/lib/communications/internal-handler";
import { processEmailBatch } from "@/lib/communications/processor";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return handleProcessorRequest(request, processEmailBatch);
}
