import crypto from "node:crypto";

export const LEAD_REFERENCE_PATTERN = /^CB-LEAD-[0-9A-F]{8}$/;
export function createLeadReference() { return `CB-LEAD-${crypto.randomBytes(4).toString("hex").toUpperCase()}`; }
export function createLeadAssociationKey() { return crypto.randomBytes(24).toString("base64url"); }
export function hashLeadToken(value: string) { return crypto.createHash("sha256").update(value).digest("hex"); }
