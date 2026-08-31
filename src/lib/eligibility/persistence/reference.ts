import { randomBytes } from "node:crypto";

export const ASSESSMENT_REFERENCE_PATTERN = /^CB-ASM-[0-9A-F]{8}$/;

export function createAssessmentReference() {
  return `CB-ASM-${randomBytes(4).toString("hex").toUpperCase()}`;
}
