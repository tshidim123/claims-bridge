import { evidenceRequirementConfig, evidenceRequirementStatusLabels } from "@/config/evidence";
import type { ClaimDocument, ClaimEvidenceRequirement } from "@/lib/db/schema/evidence";
import Link from "next/link";

type Requirement = ClaimEvidenceRequirement & { documentCount: number };

export function EvidenceRequirementList({ requirements, documents, claimReference }: { requirements: Requirement[]; documents: ClaimDocument[]; claimReference: string }) {
  return (
    <section className="evidence-requirements" aria-labelledby="evidence-requirements-title">
      <div className="claim-section-heading"><div><p className="eyebrow">Current requests</p><h2 id="evidence-requirements-title">Evidence checklist</h2></div><span>{requirements.length} {requirements.length === 1 ? "item" : "items"}</span></div>
      <ol className="evidence-requirement-list">
        {requirements.map((requirement, index) => {
          const definition = evidenceRequirementConfig[requirement.type];
          const linkedDocuments = documents.filter((document) => document.evidenceRequirementId === requirement.id);
          const actionRequired = requirement.required && (requirement.status === "REQUESTED" || requirement.status === "MORE_INFORMATION_REQUIRED");
          return (
            <li className="evidence-requirement" key={requirement.id}>
              <span className="evidence-requirement__index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <div className="evidence-requirement__body">
                <div className="evidence-requirement__heading"><div><p className="eyebrow">{definition.shortLabel}</p><h3>{requirement.title}</h3></div><span className="evidence-requirement__status" data-status={requirement.status}>{evidenceRequirementStatusLabels[requirement.status]}</span></div>
                <p>{requirement.description}</p>
                <div className="evidence-requirement__meta"><span>{requirement.required ? "Required for current review" : "Optional supporting information"}</span><span>{linkedDocuments.length} {linkedDocuments.length === 1 ? "document" : "documents"} linked</span>{requirement.dueAt && <time dateTime={requirement.dueAt.toISOString()}>Due {requirement.dueAt.toLocaleDateString("en-GB")}</time>}</div>
                {actionRequired ? <div className="evidence-requirement__action"><p>Your action may be required. Add a document when secure uploads are available.</p><Link className="text-link" href={`/account/claims/${encodeURIComponent(claimReference)}/documents?requirementType=${encodeURIComponent(requirement.type)}`}>Supply this evidence <span aria-hidden="true">→</span></Link></div> : requirement.status === "UNDER_REVIEW" ? <p className="evidence-requirement__quiet">This evidence is currently being reviewed.</p> : requirement.status === "ACCEPTED" ? <p className="evidence-requirement__quiet">This item has been recorded as accepted for the current workflow stage.</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
