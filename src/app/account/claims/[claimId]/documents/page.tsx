import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { ClaimReference } from "@/components/claims/claim-status";
import { DocumentVault } from "@/components/documents/document-vault";
import { isEvidenceRequirementType } from "@/config/evidence";
import { getClaimEvidenceWorkspaceForClient } from "@/lib/evidence/repository";
import { isR2Configured } from "@/lib/documents/r2";

export const metadata = { title: "Claim documents" };

export default async function ClaimDocumentsPage({ params, searchParams }: { params: Promise<{ claimId: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { userId } = await auth();
  const { claimId } = await params;
  const query = searchParams ? await searchParams : {};
  const requirementTypeValue = typeof query.requirementType === "string" ? query.requirementType : undefined;
  const initialRequirementType = requirementTypeValue && isEvidenceRequirementType(requirementTypeValue) ? requirementTypeValue : undefined;
  if (!userId || !process.env.DATABASE_URL) notFound();
  let workspace;
  try {
    workspace = await getClaimEvidenceWorkspaceForClient(userId, claimId);
  } catch {
    return <div className="account-page"><AccountPageHeader title="Document Vault unavailable" description="This document workspace is temporarily unavailable. Please try again shortly." /></div>;
  }
  if (!workspace) notFound();

  return (
    <div className="account-page documents-page">
      <AccountPageHeader eyebrow="Your Claims Bridge claim" title="Document Vault" description={isR2Configured() ? "A claim-specific space for secure document metadata and uploads linked to eligible evidence requests." : "A claim-specific space for document metadata. Secure uploads and downloads are unavailable until private document storage is configured."} />
      <div className="evidence-page__reference"><ClaimReference reference={workspace.claim.claimReference} /><span>Document workspace</span></div>
      <DocumentVault documents={workspace.documents} requirements={workspace.requirements} claimReference={workspace.claim.claimReference} initialRequirementType={initialRequirementType} storageConfigured={isR2Configured()} />
    </div>
  );
}
