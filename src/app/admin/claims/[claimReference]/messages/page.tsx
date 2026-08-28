import { auth } from "@clerk/nextjs/server";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminMessageWorkspace } from "@/components/admin/admin-message-workspace";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminClaimMessagingWorkspace, markAdminConversationRead } from "@/lib/admin/claims/messaging-service";

export const metadata = { title: "Claim correspondence", robots: { index: false, follow: false } };

export default async function AdminClaimMessagesPage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let workspace;
  try { workspace = await getAdminClaimMessagingWorkspace(userId, claimReference); await markAdminConversationRead(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / messages" title="Secure client correspondence" description="Read and respond to plain-text correspondence as Claims Bridge. Messages remain separate from the claim timeline and internal notes." /><AdminMessageWorkspace workspace={workspace} /></div>;
}
