import {
  DOCUMENT_MAX_SIZE_BYTES,
  documentCategoryConfig,
  evidenceRequirementConfig,
  isDocumentCategory,
  isSupportedDocumentMimeType,
  supportedDocumentTypes,
  type DocumentCategory,
  type EvidenceRequirementType,
  type SupportedDocumentMimeType,
} from "@/config/evidence";

export class DocumentValidationError extends Error {
  constructor(public readonly code: "UNSUPPORTED_TYPE" | "FILE_TOO_LARGE" | "INVALID_FILENAME" | "INVALID_CATEGORY" | "INVALID_REQUIREMENT") {
    super(code);
    this.name = "DocumentValidationError";
  }
}

const unsafeUnicode = /[\u202A-\u202E\u2066-\u2069]/g;

export function sanitizeFilename(filename: string) {
  const normalized = filename.normalize("NFKC").replace(/[\\/]/g, "_").replace(/[\u0000-\u001F\u007F]/g, "").replace(unsafeUnicode, "").replace(/\s+/g, " ").trim();
  const safe = normalized.replace(/^\.+$/, "").slice(0, 180);
  if (!safe) throw new DocumentValidationError("INVALID_FILENAME");
  return safe;
}

export function getFilenameExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : "";
}

export function isSupportedExtension(mimeType: SupportedDocumentMimeType, filename: string) {
  const definition = supportedDocumentTypes[mimeType];
  const extension = getFilenameExtension(filename);
  return extension === definition.extension || ("alternateExtensions" in definition && definition.alternateExtensions.includes(extension as never));
}

export function validateUploadRequest(input: { category: string; evidenceRequirementType?: string; filename: string; mimeType: string; sizeBytes: number }) {
  if (!isDocumentCategory(input.category)) throw new DocumentValidationError("INVALID_CATEGORY");
  if (!isSupportedDocumentMimeType(input.mimeType)) throw new DocumentValidationError("UNSUPPORTED_TYPE");
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > DOCUMENT_MAX_SIZE_BYTES) throw new DocumentValidationError("FILE_TOO_LARGE");
  const originalFilename = sanitizeFilename(input.filename);
  if (!isSupportedExtension(input.mimeType, originalFilename)) throw new DocumentValidationError("UNSUPPORTED_TYPE");
  if (input.evidenceRequirementType && (!(input.evidenceRequirementType in evidenceRequirementConfig) || evidenceRequirementConfig[input.evidenceRequirementType as EvidenceRequirementType].documentCategory !== input.category)) throw new DocumentValidationError("INVALID_REQUIREMENT");
  return { category: input.category as DocumentCategory, evidenceRequirementType: input.evidenceRequirementType as EvidenceRequirementType | undefined, originalFilename, displayName: originalFilename, mimeType: input.mimeType as SupportedDocumentMimeType, sizeBytes: input.sizeBytes };
}

export function detectDocumentMimeType(bytes: Uint8Array): SupportedDocumentMimeType | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.slice(0, 8).every((byte, index) => byte === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index])) return "image/png";
  return null;
}

export function isDocumentRequirementUploadable(status: string) {
  return status === "REQUESTED" || status === "MORE_INFORMATION_REQUIRED";
}

export function getDocumentCategoryLabel(category: DocumentCategory) {
  return documentCategoryConfig[category].label;
}
