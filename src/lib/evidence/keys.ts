import crypto from "node:crypto";

export const EVIDENCE_REQUIREMENT_REFERENCE_PATTERN = /^CB-EVR-[0-9A-F]{8}$/;

export function createEvidenceRequirementReference() {
  return `CB-EVR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
