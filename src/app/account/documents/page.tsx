import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { documentCategoryConfig, documentSecurityStatusLabels, documentStatusLabels } from "@/config/evidence";
import { isR2Configured } from "@/lib/documents/r2";
import { getDocumentIndexForClient } from "@/lib/evidence/repository";

export const metadata = { title: "Document vault" };

export default async function AccountDocumentsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Fdocuments");
  if (!process.env.DATABASE_URL) return <div className="account-page"><AccountPageHeader title="Documents unavailable" description="Your document metadata is temporarily unavailable while database configuration is completed." /></div>;
  const documents = await getDocumentIndexForClient(userId).catch(() => undefined);
  if (!documents) return <div className="account-page"><AccountPageHeader title="Documents unavailable" description="We couldn't load your document metadata just now. Please try again shortly." /></div>;
  return <div className="account-page documents-page"><AccountPageHeader title="Your documents" description="Private document metadata across your claims. Files can only be uploaded or downloaded when secure private storage is configured." />{!isR2Configured() && <section className="document-vault__empty"><p className="eyebrow">Secure storage unavailable</p><h2>Document uploads are temporarily unavailable.</h2><p>Claims Bridge has not configured private document storage in this environment. Existing metadata remains visible, and no upload or download link is being issued.</p></section>}{documents.length === 0 ? <section className="document-vault__empty"><p className="eyebrow">No documents recorded</p><h2>Your document index is clear.</h2><p>When a document is securely recorded against one of your claims, its metadata will appear here.</p></section> : <ol className="account-document-index" aria-label="Document metadata">{documents.map((document) => <li key={`${document.claimReference}-${document.documentReference ?? document.displayName}`}><Link href={`/account/claims/${encodeURIComponent(document.claimReference)}/documents`}><div><strong>{document.displayName}</strong><span>{documentCategoryConfig[document.category].label} · {document.mimeType ?? "File type pending"}</span></div><div><span>{documentSecurityStatusLabels[document.securityStatus]} · {documentStatusLabels[document.status]}</span><small>{document.uploadedAt ? `Uploaded ${document.uploadedAt.toLocaleDateString("en-GB")}` : `Added ${document.createdAt.toLocaleDateString("en-GB")}`} · {document.claimReference}</small></div></Link></li>)}</ol>}</div>;
}
