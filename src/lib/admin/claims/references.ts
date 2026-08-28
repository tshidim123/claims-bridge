import { randomBytes } from "node:crypto";

export const NOTE_REFERENCE_PATTERN = /^CB-NTE-[0-9A-F]{8}$/;

export function createInternalNoteReference() {
  return `CB-NTE-${randomBytes(4).toString("hex").toUpperCase()}`;
}
