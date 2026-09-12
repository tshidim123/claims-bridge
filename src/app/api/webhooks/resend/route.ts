import { handleResendWebhook } from "@/lib/communications/webhook-handler";
import { recordResendDeliveryEvent } from "@/lib/communications/webhook";

export const runtime = "nodejs";
export async function POST(request: Request) {
  return handleResendWebhook(request, recordResendDeliveryEvent);
}
