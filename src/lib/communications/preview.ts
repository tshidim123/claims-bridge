import { buildAssessmentOutcome } from "@/lib/eligibility/outcome";
import type { CommunicationEmailInput } from "./email";
import type { Environment } from "./config";
import { communicationEvents, type CommunicationEventKey } from "./registry";

export function communicationPreviewEnabled(env: Environment) {
  return env.NODE_ENV === "development" && !env.VERCEL_ENV;
}

export const previewEvents = Object.keys(
  communicationEvents,
) as CommunicationEventKey[];
export const previewScenarios = ["standard", "long", "no-due-date"] as const;
export type PreviewScenario = (typeof previewScenarios)[number];

/** Synthetic fixtures only. No repository, identity provider, database or delivery calls. */
export function previewInput(
  event: CommunicationEventKey,
  scenario: PreviewScenario = "standard",
): CommunicationEmailInput {
  const long = scenario === "long";
  const claimReference = long
    ? `CB-CLM-${"DEMO2026".repeat(7)}`
    : "CB-CLM-DEMO2026";
  const assessmentReference = "CB-ASM-DEMO2026";
  const title = long
    ? "Supporting tenancy agreement and deposit correspondence covering the original tenancy, renewal periods and all subsequent amendments"
    : "Tenancy agreement";
  const dueDate = scenario === "no-due-date" ? undefined : "30 September 2026";
  const outcome = buildAssessmentOutcome({
    jurisdiction: "england",
    deposit_paid: "yes",
    protected_told: "no",
    tenancy_party: "agent",
  });
  switch (event) {
    case "START_CLAIM_REMINDER":
    case "ASSESSMENT_FOLLOW_UP":
    case "GENERAL_SERVICE_UPDATE":
      return { event, payload: { reference: assessmentReference, title: "Your Claims Bridge next steps", body: "Your saved assessment is ready to review in your secure account.", nextStep: "Create or sign into your account and review your saved assessment. Start a claim only when ready.", destination: "/account/assessments", cta: event === "START_CLAIM_REMINDER" ? "START MY CLAIM" : "OPEN MY ACCOUNT" } };
    case "ASSESSMENT_RECEIVED":
      return {
        event,
        payload: {
          assessmentReference,
          outcome: outcome.headline,
          explanation: outcome.explanation,
          evidence: outcome.evidence.map(({ label, description }) => ({
            label,
            description,
          })),
          continuationUrl: "/sign-up?redirect_url=%2Faccount%2Fassessment",
        },
      };
    case "WELCOME":
      return {
        event,
        payload: {
          firstName: long
            ? "Alexandra-Morgan Theodora Montgomery-Wellington"
            : "Alex",
          accountUrl: "/account",
        },
      };
    case "ASSESSMENT_ATTACHED_TO_ACCOUNT":
      return {
        event,
        payload: { assessmentReference, outcome: outcome.headline },
      };
    case "CLAIM_CREATED":
      return {
        event,
        payload: {
          claimReference,
          stage: "Initial review",
          summary:
            "Your claim has been created at your request. We will review the supporting information next.",
          evidence: outcome.evidence.map((item) => item.label),
        },
      };
    case "CLAIM_STATUS_UPDATED":
      return {
        event,
        payload: {
          claimReference,
          heading: "Your claim is being reviewed",
          summary: "Your supporting information is ready for review.",
          nextStep: "We will contact you securely if anything else is needed.",
          actionRequired: false,
        },
      };
    case "CLAIM_COMPLETED":
      return {
        event,
        payload: {
          claimReference,
          heading: "Your claim workflow is complete",
          summary:
            "The workflow has reached its final stage. This does not imply a particular legal or financial outcome.",
          nextStep: "View the final update in your secure account.",
          actionRequired: false,
        },
      };
    case "EVIDENCE_REQUESTED":
      return {
        event,
        payload: {
          claimReference,
          requirementReference: "CB-EVD-DEMO2026",
          title,
          description: "Please provide a readable copy in your secure account.",
          dueDate,
        },
      };
    case "DOCUMENT_RECEIVED":
      return {
        event,
        payload: {
          claimReference,
          documentReference: "CB-DOC-DEMO2026",
          title,
        },
      };
    case "DOCUMENT_ACTION_REQUIRED":
      return {
        event,
        payload: {
          claimReference,
          documentReference: "CB-DOC-DEMO2026",
          title,
          reason: "Please upload a clearer copy so every page can be reviewed.",
        },
      };
    case "NEW_SECURE_MESSAGE":
      return { event, payload: { claimReference } };
    case "CLIENT_ACTION_REQUIRED":
      return {
        event,
        payload: {
          claimReference,
          actionReference: "CB-ACT-DEMO2026",
          title: long ? title : "Confirm your tenancy dates",
          description: "Review the requested next step in your secure account.",
          dueDate,
        },
      };
    case "NEW_CLIENT":
    case "NEW_PRE_ACCOUNT_ASSESSMENT":
    case "NEW_AUTHENTICATED_ASSESSMENT":
    case "NEW_CLAIM":
    case "CLIENT_MESSAGE_RECEIVED":
    case "EVIDENCE_UPLOADED":
    case "CLIENT_ACTION_COMPLETED":
    case "CLAIM_ASSIGNED":
    case "HIGH_PRIORITY_CLAIM": {
      const definition = communicationEvents[event];
      return {
        event,
        payload: {
          reference: event.includes("ASSESSMENT")
            ? assessmentReference
            : claimReference,
          summary:
            "An operational update is ready for your attention in the secure staff workspace.",
          destination: definition.destination,
          subject: definition.subject!,
          preheader: definition.preheader!,
        },
      };
    }
    default: {
      const exhaustive: never = event;
      throw new Error(`Missing preview fixture: ${exhaustive}`);
    }
  }
}

export function isolatedPreviewHtml(html: string, imagesOff: boolean) {
  const policy = `default-src 'none'; style-src 'unsafe-inline'; img-src ${imagesOff ? "'none'" : "https: http:"}; base-uri 'none'; form-action 'none'`;
  const meta = `<meta http-equiv="Content-Security-Policy" content="${policy}"><meta name="viewport" content="width=device-width, initial-scale=1">`;
  return html.includes("<head>")
    ? html.replace("<head>", `<head>${meta}`)
    : html.replace(/<html[^>]*>/, (tag) => `${tag}<head>${meta}</head>`);
}
