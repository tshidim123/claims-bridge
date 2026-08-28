import crypto from "node:crypto";

export function createOpaqueStorageKey() {
  return `quarantine/${crypto.randomUUID()}/${crypto.randomUUID()}`;
}

export function createOpaqueDocumentReference() {
  return crypto.randomUUID();
}
