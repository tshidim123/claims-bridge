import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminInternalNoteForm } from "@/components/admin/admin-claim-controls";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminClaimWorkspace } from "@/lib/admin/claims/repository";

export default async function AdminClaimNotesPage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let workspace;
  try { workspace = await getAdminClaimWorkspace(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  if (!workspace) notFound();
  if (!workspace.permissions.includes("CLAIMS_MANAGE")) return <AdminAccessDenied forbidden />;
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / internal notes" title="A private operational notebook." description="Notes are staff-only, plain text and append-oriented. They never enter the client timeline, messages or notifications." /><AdminInternalNoteForm claimReference={workspace.claim.claimReference} />{workspace.notes.length > 0 ? <ol className="admin-note-list" aria-label="Internal claim notes">{workspace.notes.map((note) => <li key={note.noteReference}><div><strong>{note.authorName ?? "Claims Bridge staff"}</strong><span>{note.authorReference}</span><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></div><p>{note.body}</p></li>)}</ol> : <div className="admin-empty"><p>No internal notes have been added to this claim.</p></div>}</div>;
}
