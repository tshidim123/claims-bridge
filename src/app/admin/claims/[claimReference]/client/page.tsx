import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getAdminClaimClient } from "@/lib/admin/claims/repository";

export default async function AdminClaimClientPage({ params }: { params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let client;
  try { client = await getAdminClaimClient(userId, claimReference); } catch { return <AdminAccessDenied forbidden />; }
  if (!client) notFound();
  return <div className="admin-page"><AdminPageHeader eyebrow="Claim workspace / client" title={client.name} description="Minimised client information for authorised operational use. Authentication identifiers and raw account metadata are not shown." /><dl className="admin-info-grid"><div><dt>Profile status</dt><dd>{client.onboardingStatus.toLowerCase().replaceAll("_", " ")}</dd></div><div><dt>Preferred contact method</dt><dd>{client.preferredContactMethod}</dd></div><div><dt>Phone</dt><dd>{client.phone ?? "Not provided"}</dd></div><div><dt>Profile created</dt><dd>{new Date(client.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</dd></div><div><dt>Last profile update</dt><dd>{new Date(client.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</dd></div></dl><p className="admin-muted-note">Client information is operationally sensitive and should only be used for the authorised Claims Bridge workflow.</p></div>;
}
