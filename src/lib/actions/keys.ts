import { randomBytes } from "node:crypto";

export const CLIENT_ACTION_REFERENCE_PATTERN = /^CB-ACT-[0-9A-F]{8}$/;

export function createClientActionReference() {
  return `CB-ACT-${randomBytes(4).toString("hex").toUpperCase()}`;
}
