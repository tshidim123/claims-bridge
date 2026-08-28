"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { DOCUMENT_MAX_SIZE_LABEL, documentCategories, documentCategoryConfig, evidenceRequirementConfig, isDocumentCategory, supportedDocumentTypes, type DocumentCategory, type EvidenceRequirementType } from "@/config/evidence";
import { DocumentValidationError, validateUploadRequest } from "@/lib/documents/validation";

type UploadZoneProps = { claimReference: string; initialRequirementType?: EvidenceRequirementType; storageConfigured: boolean };
type UploadState = "IDLE" | "UPLOADING" | "FINALIZING" | "SUCCESS" | "ERROR";

const supportedMimeTypes = Object.keys(supportedDocumentTypes).join(",");

function errorMessage(error: unknown) {
  if (!(error instanceof DocumentValidationError)) return "We couldn't complete this upload. Your claim has not been affected.";
  if (error.code === "FILE_TOO_LARGE") return `This file is larger than the ${DOCUMENT_MAX_SIZE_LABEL} limit.`;
  if (error.code === "UNSUPPORTED_TYPE") return "Unsupported file type. Please choose a PDF, JPEG or PNG file.";
  return "Please check the selected document and try again.";
}

function formatBytes(size: number) {
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone({ claimReference, initialRequirementType, storageConfigured }: UploadZoneProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultCategory = initialRequirementType ? evidenceRequirementConfig[initialRequirementType].documentCategory : "OTHER_SUPPORTING_EVIDENCE";
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>("IDLE");
  const [message, setMessage] = useState("");

  function chooseFile(file: File | undefined) {
    if (!file) return;
    try {
      validateUploadRequest({ category, evidenceRequirementType: initialRequirementType, filename: file.name, mimeType: file.type, sizeBytes: file.size });
      setSelectedFile(file);
      setState("IDLE");
      setMessage("");
    } catch (error) {
      setSelectedFile(null);
      setState("ERROR");
      setMessage(errorMessage(error));
    }
  }

  async function uploadFile() {
    if (!selectedFile || state === "UPLOADING" || state === "FINALIZING") return;
    setState("UPLOADING");
    setMessage("Requesting a secure upload link…");
    try {
      const basePath = `/api/account/claims/${encodeURIComponent(claimReference)}/documents`;
      const authorizationResponse = await fetch(`${basePath}/authorize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, evidenceRequirementType: initialRequirementType, filename: selectedFile.name, mimeType: selectedFile.type, sizeBytes: selectedFile.size }) });
      const authorization = await authorizationResponse.json().catch(() => ({}));
      if (!authorizationResponse.ok || typeof authorization.uploadUrl !== "string" || typeof authorization.uploadId !== "string") throw new Error(typeof authorization.error === "string" ? authorization.error : "We couldn't start this upload. Your claim has not been affected.");
      setMessage("Uploading securely…");
      const objectResponse = await fetch(authorization.uploadUrl, { method: "PUT", headers: { "Content-Type": selectedFile.type }, body: selectedFile });
      if (!objectResponse.ok) throw new Error("We couldn't complete this upload. Your claim has not been affected.");
      setState("FINALIZING");
      setMessage("Validating the document…");
      const finalizationResponse = await fetch(`${basePath}/finalize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uploadId: authorization.uploadId }) });
      const finalization = await finalizationResponse.json().catch(() => ({}));
      if (!finalizationResponse.ok) throw new Error(typeof finalization.error === "string" ? finalization.error : "We couldn't complete this upload. Your claim has not been affected.");
      setState("SUCCESS");
      setMessage("Document received. Its file type has been validated.");
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (error) {
      setState("ERROR");
      setMessage(error instanceof Error && error.message ? error.message : "We couldn't complete this upload. Your claim has not been affected.");
    }
  }

  const busy = state === "UPLOADING" || state === "FINALIZING";
  return (
    <section className="document-upload" aria-labelledby="document-upload-title">
      <div className="document-upload__heading"><div><p className="eyebrow">Private upload</p><h3 id="document-upload-title">Add a document securely</h3><p>Choose a PDF, JPEG or PNG up to {DOCUMENT_MAX_SIZE_LABEL}. Files are checked before their metadata is added to your claim.</p></div><span className="document-upload__mark" aria-hidden="true">+</span></div>
      {!storageConfigured && <p className="document-upload__configuration">Secure document storage is not configured yet. Uploads will become available after the private R2 environment is connected.</p>}
      {initialRequirementType && <p className="document-upload__context">For evidence request: <strong>{evidenceRequirementConfig[initialRequirementType].shortLabel}</strong></p>}
      <div className="document-upload__controls">
        <div><label htmlFor="document-category">Document category</label><select id="document-category" value={category} disabled={!storageConfigured || busy || Boolean(initialRequirementType)} onChange={(event) => { const next = event.target.value; if (isDocumentCategory(next)) setCategory(next); }}><option value="">Choose a category</option>{documentCategories.map((item) => <option key={item} value={item}>{documentCategoryConfig[item].label}</option>)}</select></div>
        <div className="document-upload__picker"><label className={`button button--glass button--medium${!storageConfigured ? " is-disabled" : ""}`} htmlFor="document-file"><span className="button__label">Choose file</span></label><input ref={inputRef} id="document-file" type="file" accept={supportedMimeTypes} disabled={!storageConfigured || busy} onChange={(event) => chooseFile(event.target.files?.[0])} /><span>or drop a file here</span></div>
      </div>
      {selectedFile && <div className="document-upload__selected"><div><strong>{selectedFile.name}</strong><span>{selectedFile.type} · {formatBytes(selectedFile.size)}</span></div><button className="button button--primary button--medium" type="button" onClick={uploadFile} disabled={busy}><span className="button__label">{busy ? "Processing…" : "Upload document"}</span></button></div>}
      <p className="document-upload__status" role={state === "ERROR" ? "alert" : "status"} aria-live="polite">{message || `Accepted file types: PDF, JPEG and PNG. Maximum size: ${DOCUMENT_MAX_SIZE_LABEL}.`}</p>
      <div className="document-upload__drop" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (storageConfigured) chooseFile(event.dataTransfer.files?.[0]); }} aria-hidden="true">Drop a file here to select it</div>
    </section>
  );
}
