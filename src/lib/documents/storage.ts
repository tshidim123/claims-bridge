import "server-only";

export { createOpaqueDocumentReference, createOpaqueStorageKey } from "./keys";

export type StoredObjectHead = { contentLength: number; contentType: string | null; checksum: string | null };
export type PrivateObjectStorage = {
  createUploadUrl(input: { key: string; contentType: string; expiresInSeconds: number }): Promise<string>;
  headObject(key: string): Promise<StoredObjectHead>;
  getObjectPrefix(key: string, byteCount: number): Promise<Uint8Array>;
  deleteObject(key: string): Promise<void>;
  createDownloadUrl(key: string, expiresInSeconds: number): Promise<string>;
};

export class StorageNotConfiguredError extends Error {
  constructor() { super("Private document storage is not configured."); this.name = "StorageNotConfiguredError"; }
}

export async function getPrivateObjectStorage(): Promise<PrivateObjectStorage> {
  const { getR2Storage } = await import("./r2");
  return getR2Storage();
}
