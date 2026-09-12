export type AssessmentEmailState =
  "queued" | "sent" | "delivered" | "failed" | "unavailable";

export function assessmentEmailState(
  status: string,
  providerDelivered = false,
): AssessmentEmailState {
  if (
    ["FAILED", "CANCELLED", "SUPPRESSED", "BOUNCED", "COMPLAINED"].includes(
      status,
    )
  )
    return "failed";
  if (providerDelivered) return "delivered";
  if (status === "SENT") return "sent";
  return ["PENDING", "PROCESSING", "RETRY"].includes(status)
    ? "queued"
    : "unavailable";
}

export function assessmentEmailMessage(state: AssessmentEmailState) {
  switch (state) {
    case "queued":
      return "We’re sending your confirmation email.";
    case "sent":
      return "Your confirmation email has been sent.";
    case "delivered":
      return "Your confirmation email has been delivered.";
    case "failed":
      return "Your assessment is safely saved, but we couldn't send your confirmation email yet.";
    default:
      return "Your assessment is safely saved. Confirmation email status is currently unavailable.";
  }
}
