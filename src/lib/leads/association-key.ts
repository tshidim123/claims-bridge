/**
 * Generates the per-capture association key in the browser.
 *
 * Twenty-four random bytes retain 192 bits of entropy. Hex encoding is
 * URL/form safe and does not require Node's Buffer or crypto APIs.
 */
export function createLeadAssociationKey(): string {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
