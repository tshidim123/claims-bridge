import crypto from "node:crypto";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERENCE_LENGTH = 8;

export const CLAIM_REFERENCE_PATTERN = /^CB-\d{2}-[A-HJ-NP-Z2-9]{8}$/;

export function generateClaimReference(now = new Date()): string {
  const year = String(now.getUTCFullYear()).slice(-2);
  const random = crypto.randomBytes(REFERENCE_LENGTH);
  let suffix = "";

  for (const byte of random) suffix += REFERENCE_ALPHABET[byte & 31];

  return `CB-${year}-${suffix}`;
}
