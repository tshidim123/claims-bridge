import { z } from "zod";
import {
  evidenceRequirementConfig,
  evidenceRequirementTypes,
} from "@/config/evidence";
import { clientActionTypes } from "@/config/client-actions";

export const communicationPresets = {
  REQUEST_DOCUMENTS: {
    label: "Request documents",
    effect:
      "Create or reuse a document requirement in the claim, with email and an in-app notification.",
  },
  NEXT_STEPS: {
    label: "Next steps",
    effect:
      "Create a client task with clear instructions in the claim, with email and an in-app notification.",
  },
  START_CLAIM_REMINDER: {
    label: "Start claim reminder",
    effect:
      "Invite the recipient to review an eligible saved assessment and choose whether to start a claim.",
  },
  MISSING_INFORMATION: {
    label: "Missing information",
    effect:
      "Create a confirmation task in the claim, with email and an in-app notification.",
  },
  CLAIM_UPDATE: {
    label: "Claim update",
    effect:
      "Share the current recorded claim stage and add a client-visible timeline update and notification.",
  },
  ACTION_REQUIRED: {
    label: "Action required",
    effect:
      "Create a client task in the claim, with email and an in-app notification.",
  },
  ASSESSMENT_FOLLOW_UP: {
    label: "Assessment follow-up",
    effect:
      "Send a service follow-up about the saved assessment and how to review it securely.",
  },
  GENERAL_SERVICE_UPDATE: {
    label: "General service update",
    effect:
      "Send a bounded service notice using the Claims Bridge email design. Use a task preset for instructions requiring a portal action.",
  },
} as const;
export type CommunicationPreset = keyof typeof communicationPresets;
export const actionPresets: readonly CommunicationPreset[] = [
  "NEXT_STEPS",
  "MISSING_INFORMATION",
  "ACTION_REQUIRED",
];
export const assessmentPresets: readonly CommunicationPreset[] = [
  "START_CLAIM_REMINDER",
  "ASSESSMENT_FOLLOW_UP",
];
const plain = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/[<>\u0000-\u0008\u000b-\u001f\u007f]/.test(value),
      "Use plain text without markup or control characters.",
    )
    .refine(
      (value) => !/(?:https?:\/\/|www\.|javascript:|data:)/i.test(value),
      "Use the controlled portal destination for links.",
    );
const title = plain(120).refine(
  (value) => !/[\r\n]/.test(value),
  "Use a single line.",
);
const reference = z.string().regex(/^CB-(?:CLT|ASM|CLM)-[A-Z0-9-]{6,40}$/);
export const manualCommunicationSchema = z
  .object({
    preset: z.enum(
      Object.keys(communicationPresets) as [
        CommunicationPreset,
        ...CommunicationPreset[],
      ],
    ),
    clientReference: reference.optional(),
    assessmentReference: reference.optional(),
    claimReference: reference.optional(),
    requestId: z.uuid(),
    evidenceType: z.enum(evidenceRequirementTypes).optional(),
    actionType: z.enum(clientActionTypes).optional(),
    title: title.optional(),
    body: plain(2000).optional(),
    nextStep: plain(300).optional(),
    destination: z.enum(["ACCOUNT", "ASSESSMENT", "CLAIM"]).default("ACCOUNT"),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === value
        );
      })
      .optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (!input.clientReference && !input.assessmentReference)
      invalid("Choose a saved client or assessment.");
    if (
      (actionPresets.includes(input.preset) ||
        ["REQUEST_DOCUMENTS", "CLAIM_UPDATE"].includes(input.preset)) &&
      (!input.clientReference || !input.claimReference)
    )
      invalid("Choose an associated claim.");
    if (assessmentPresets.includes(input.preset) && !input.assessmentReference)
      invalid("Choose an assessment.");
    if (input.preset === "REQUEST_DOCUMENTS" && !input.evidenceType)
      invalid("Choose a document requirement.");
    if (
      actionPresets.includes(input.preset) &&
      (!input.title || !input.body || !input.actionType)
    )
      invalid("Provide the action type, title and instructions.");
    if (
      input.preset === "GENERAL_SERVICE_UPDATE" &&
      (!input.clientReference || !input.title || !input.body || !input.nextStep)
    )
      invalid("Provide the client, title, service notice and next step.");
    if (input.destination === "CLAIM" && !input.claimReference)
      invalid("Choose a claim for this destination.");
    if (input.destination === "ASSESSMENT" && !input.assessmentReference)
      invalid("Choose an assessment for this destination.");
  });
export type ManualCommunicationInput = z.infer<
  typeof manualCommunicationSchema
>;
export function canRemindStartClaim(
  assessment: { status: string; completed: boolean; outcome: string },
  hasClaim: boolean,
) {
  return (
    assessment.status === "COMPLETE" &&
    assessment.completed &&
    !hasClaim &&
    !["OUTSIDE_CURRENT_SCOPE", "NO_DEPOSIT_PATH"].includes(assessment.outcome)
  );
}
export function manualSubject(
  input: Pick<ManualCommunicationInput, "preset" | "claimReference" | "title">,
) {
  if (input.preset === "REQUEST_DOCUMENTS")
    return `Evidence needed for your Claims Bridge claim — ${input.claimReference ?? "Select a claim"}`;
  if (actionPresets.includes(input.preset))
    return `Action needed on your Claims Bridge claim — ${input.claimReference ?? "Select a claim"}`;
  if (input.preset === "CLAIM_UPDATE")
    return `An update on your Claims Bridge claim — ${input.claimReference ?? "Select a claim"}`;
  if (input.preset === "START_CLAIM_REMINDER")
    return "Your saved assessment: start your claim when ready";
  if (input.preset === "ASSESSMENT_FOLLOW_UP")
    return "Your Claims Bridge assessment: next steps";
  return input.title || "Claims Bridge service update";
}
export function manualDestination(
  input: Pick<
    ManualCommunicationInput,
    "preset" | "destination" | "assessmentReference" | "claimReference"
  >,
) {
  if (input.preset === "REQUEST_DOCUMENTS")
    return `/account/claims/${input.claimReference}/evidence`;
  if (
    actionPresets.includes(input.preset) ||
    input.preset === "CLAIM_UPDATE" ||
    input.destination === "CLAIM"
  )
    return `/account/claims/${input.claimReference}`;
  if (
    assessmentPresets.includes(input.preset) ||
    input.destination === "ASSESSMENT"
  )
    return `/account/assessments/${input.assessmentReference}`;
  return "/account";
}
export function evidenceSummary(
  type: ManualCommunicationInput["evidenceType"],
) {
  return type
    ? evidenceRequirementConfig[type].description
    : "Choose the document to request.";
}
