import { documentCategoryConfig, documentSecurityStatusLabels, documentStatusLabels } from "@/config/evidence";
import type { ClaimDocument, ClaimEvidenceRequirement } from "@/lib/db/schema/evidence";
import { UploadZone } from "./upload-zone";

export function DocumentVault({ documents, requirements, claimReference, initialRequirementType, storageConfigured }: { documents: ClaimDocument[]; requirements: ClaimEvidenceRequirement[]; claimReference: string; initialRequirementType?: import("@/config/evidence").EvidenceRequirementType; storageConfigured: boolean }) {
  const visibleRequirements = new Map(requirements.map((requirement) => [requirement.id, requirement.title]));

  return (
    <section className="document-vault" aria-labelledby="document-vault-title">
      <div className="document-vault__heading"><div><p className="eyebrow">Private claim records</p><h2 id="document-vault-title">Document Vault</h2><p>Document metadata will be organised here. Secure private file storage is not active in this phase.</p></div><span className="document-vault__availability">Uploads not active</span></div>
      <UploadZone claimReference={claimReference} initialRequirementType={initialRequirementType} storageConfigured={storageConfigured} />
      {documents.length === 0 ? <div className="document-vault__empty"><p className="eyebrow">No documents recorded</p><h3>Your vault is clear for now.</h3><p>No document metadata has been added to this claim. If evidence is requested, the relevant requirement will appear on the Evidence page.</p></div> : <ol className="document-list" aria-label="Claim document metadata"><li className="document-list__header"><span>Document</span><span>Processing</span><span>Requirement</span><span>Access</span></li>{documents.map((document) => <li className="document-row" key={document.id}><div><strong>{document.displayName}</strong><span>{documentCategoryConfig[document.category].label} · {document.mimeType ?? "File type pending"} · {formatBytes(document.sizeBytes)}</span><time dateTime={(document.uploadedAt ?? document.createdAt).toISOString()}>{document.uploadedAt ? `Uploaded ${document.uploadedAt.toLocaleDateString("en-GB")}` : `Added ${document.createdAt.toLocaleDateString("en-GB")}`}</time></div><span className="document-row__status" data-status={document.status}>{documentSecurityStatusLabels[document.securityStatus]} · {documentStatusLabels[document.status]}</span><span>{document.evidenceRequirementId && visibleRequirements.get(document.evidenceRequirementId) ? visibleRequirements.get(document.evidenceRequirementId) : "Claim record"}</span>{document.documentReference && document.storageKey && document.securityStatus === "VALIDATED" ? <a className="text-link" href={`/api/account/claims/${encodeURIComponent(claimReference)}/documents/${encodeURIComponent(document.documentReference)}/download`}>Download<span className="sr-only"> {document.displayName}</span></a> : <span className="document-row__unavailable">Not available</span>}</li>)}</ol>}
      <p className="document-vault__privacy">Only claim-owned document metadata is shown here. Storage keys and technical identifiers are never displayed. Technical file validation is active; malware scanning is not configured yet.</p>
    </section>
  );
}

function formatBytes(size: number | null) {
  if (!size) return "Size pending";
  return size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
