import { randomBytes } from "node:crypto";

export const STAFF_REFERENCE_PATTERN = /^CB-STF-[0-9A-F]{8}$/;

export function createStaffReference(): string {
  return `CB-STF-${randomBytes(4).toString("hex").toUpperCase()}`;
}
