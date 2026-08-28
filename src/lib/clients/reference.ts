import { randomBytes } from "node:crypto";

export const CLIENT_REFERENCE_PATTERN = /^CB-CLT-[0-9A-F]{8}$/;

export function createClientReference() {
  return `CB-CLT-${randomBytes(4).toString("hex").toUpperCase()}`;
}
