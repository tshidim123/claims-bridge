import { z } from "zod";

import { getFirstQuestionId } from "@/lib/eligibility/flow";
import type { AssessmentState } from "@/lib/eligibility/types";

export const ELIGIBILITY_SESSION_KEY = "claims-bridge:eligibility:v1";

const questionIds = [
  "jurisdiction",
  "jurisdiction_route",
  "main_home",
  "tenancy_party",
  "tenancy_start",
  "deposit_paid",
  "deposit_uncertain",
  "deposit_amount",
  "deposit_paid_date",
  "deposit_recipient",
  "protected_told",
  "protection_scheme",
  "registration_evidence",
  "protection_timing",
  "deposit_information",
  "information_held",
  "tenancy_ended",
  "tenancy_end",
  "evidence_available",
] as const;

const questionIdSchema = z.enum(questionIds);
const sectionIdSchema = z.enum(["property", "tenancy", "deposit", "protection", "information", "evidence"]);
const answerValueSchema = z.union([z.string(), z.array(z.string()), z.boolean()]);

const assessmentStateSchema = z.object({
  answers: z.record(z.string(), answerValueSchema),
  completedSectionIds: z.array(sectionIdSchema),
  completedQuestionIds: z.array(questionIdSchema),
  currentStepId: z.union([z.literal("intro"), questionIdSchema, z.literal("review"), z.literal("outcome")]),
  editingFromReview: z.boolean(),
  history: z.array(questionIdSchema),
  startedAt: z.string().nullable(),
  status: z.enum(["intro", "in-progress", "review", "complete"]),
  outcomeId: z.enum(["REVIEW_RECOMMENDED", "MORE_INFORMATION_NEEDED", "OUTSIDE_CURRENT_SCOPE", "NO_DEPOSIT_PATH", "INDIVIDUAL_REVIEW"]).optional(),
  updatedAt: z.string(),
  version: z.literal(1),
});

export function createInitialAssessmentState(): AssessmentState {
  return {
    version: 1,
    status: "intro",
    currentStepId: "intro",
    answers: {},
    completedSectionIds: [],
    history: [],
    completedQuestionIds: [],
    startedAt: null,
    updatedAt: new Date().toISOString(),
    editingFromReview: false,
  };
}

export function startAssessmentState(): AssessmentState {
  const timestamp = new Date().toISOString();
  return {
    ...createInitialAssessmentState(),
    status: "in-progress",
    currentStepId: getFirstQuestionId(),
    startedAt: timestamp,
    updatedAt: timestamp,
  };
}

export function parseStoredAssessmentState(value: string | null): AssessmentState | null {
  if (!value) return null;
  try {
    const result = assessmentStateSchema.safeParse(JSON.parse(value));
    return result.success ? (result.data as AssessmentState) : null;
  } catch {
    return null;
  }
}
