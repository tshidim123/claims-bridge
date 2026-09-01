import { z } from "zod";

import type {
  AnswerValue,
  EligibilityAnswers,
  EligibilityQuestion,
} from "@/lib/eligibility/types";

export type ValidationResult = { valid: true } | { error: string; valid: false };

export const customLocationPattern = /^[\p{L}][\p{L}\s.'-]*$/u;
export function normalizeCustomLocation(value: string) { return value.trim().replace(/\s+/g, " "); }

function isEmpty(value: AnswerValue | undefined) {
  return (
    value === undefined ||
    value === false ||
    (typeof value === "string" && value.trim() === "") ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function normaliseMoneyInput(value: string) {
  return value.replace(/[£,\s]/g, "");
}

export function validateQuestionAnswer(
  question: EligibilityQuestion,
  value: AnswerValue | undefined,
  answers: EligibilityAnswers,
): ValidationResult {
  if (question.fieldType === "informational" || question.fieldType === "review") {
    return { valid: true };
  }

  if (isEmpty(value)) {
    if (!question.required) return { valid: true };
    return {
      valid: false,
      error: question.validation?.message ?? "Choose or enter an answer before continuing.",
    };
  }

  if (question.fieldType === "single-choice" || question.fieldType === "yes-no") {
    const allowedValues = question.options.map((option) => option.value);
    const result = z.string().refine((answer) => allowedValues.includes(answer)).safeParse(value);
    if (!result.success) {
      return { valid: false, error: question.validation?.message ?? "Choose one of the available answers." };
    }
  }

  if (question.fieldType === "multiple-choice") {
    const minimum = question.validation?.min ?? (question.required ? 1 : 0);
    const allowedValues = question.options.map((option) => option.value);
    const result = z
      .array(z.string())
      .min(minimum)
      .refine((items) => items.every((item) => allowedValues.includes(item)))
      .safeParse(value);
    if (!result.success) {
      return { valid: false, error: question.validation?.message ?? "Select at least one answer." };
    }
  }

  if (question.fieldType === "date") {
    const result = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(value);
    const parsedDate = result.success ? new Date(`${result.data}T00:00:00`) : null;
    const validDate = parsedDate && !Number.isNaN(parsedDate.getTime());
    const isFuture = parsedDate ? parsedDate.getTime() > Date.now() : false;

    if (!validDate || (!question.validation?.allowFuture && isFuture)) {
      return { valid: false, error: question.validation?.message ?? "Enter a valid date." };
    }

    if (question.id === "tenancy_end" && typeof answers.tenancy_start === "string") {
      const start = new Date(`${answers.tenancy_start}T00:00:00`);
      if (parsedDate.getTime() < start.getTime()) {
        return { valid: false, error: "The tenancy end date must be on or after the start date." };
      }
    }
  }

  if (question.fieldType === "money") {
    const result = z.coerce.number().finite().safeParse(normaliseMoneyInput(String(value)));
    const minimum = question.validation?.min ?? 0;
    const maximum = question.validation?.max ?? Number.POSITIVE_INFINITY;
    if (!result.success || result.data < minimum || result.data > maximum) {
      return { valid: false, error: question.validation?.message ?? "Enter a valid amount." };
    }
  }

  if (question.fieldType === "text" || question.fieldType === "address") {
    const maximum = question.validation?.max ?? 500;
    const minimum = question.validation?.min ?? (question.required ? 1 : 0);
    const result = z.string().trim().min(minimum).max(maximum).safeParse(value);
    if (!result.success) {
      return { valid: false, error: question.validation?.message ?? "Check the information entered." };
    }
    if (question.id === "custom_location") {
      const location = normalizeCustomLocation(String(value));
      if (location.length < 2 || location.length > 120 || !customLocationPattern.test(location)) return { valid: false, error: question.validation?.message ?? "Enter a valid location." };
    }
  }

  if (question.fieldType === "confirmation" && value !== true) {
    return { valid: false, error: question.validation?.message ?? "Confirm before continuing." };
  }

  return { valid: true };
}
