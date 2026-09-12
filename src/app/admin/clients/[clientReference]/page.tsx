import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminClientCorrectionForm } from "@/components/admin/admin-client-correction-form";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getClientAssessmentsForAdmin, getClientOperationalProfile } from "@/lib/admin/operations/repository";
import { getCurrentStaffContext } from "@/lib/staff/request";
import { CommunicationActions } from "@/components/admin/communication-actions";
import { ClientCommunicationHistory } from "@/components/admin/client-communication-history";

export const metadata = { title: "Client operational profile", robots: { index: false, follow: false } };

export default async function AdminClientProfilePage({ params }: { params: Promise<{ clientReference: string }> }) {
  const { userId } = await auth();
  const context = userId ? await getCurrentStaffContext() : null;
  if (!userId || !context?.permissions.includes("CLIENTS_VIEW")) return <AdminAccessDenied forbidden />;

  const { clientReference } = await params;
  let profile;
  try {
    profile = await getClientOperationalProfile(userId, clientReference);
  } catch {
    return <AdminAccessDenied forbidden />;
  }
  if (!profile) return <div className="admin-page"><AdminPageHeader eyebrow="Operations / clients" title="Client record unavailable." description="The requested client reference could not be found in the authorised operational domain." /></div>;

  const assessments = (await getClientAssessmentsForAdmin(userId, profile.clientReference).catch(() => [])) ?? [];
  return (
    <div className="admin-page">
      <AdminPageHeader eyebrow="Operations / client profile" title={profile.name} description="A protected operational view of real profile and claim relationships. Authentication identifiers and raw database IDs remain private." />
      {context.permissions.includes("COMMUNICATIONS_SEND") && <CommunicationActions clientReference={profile.clientReference} identity={profile.name} claims={profile.claims} assessments={assessments} />}
      <ClientCommunicationHistory clientReference={profile.clientReference} />
      <div className="admin-profile-grid">
        <section className="admin-command-panel admin-command-panel--primary">
          <p className="eyebrow">Safe client reference</p>
          <strong className="admin-reference">{profile.clientReference}</strong>
          <dl className="admin-detail-list">
            <div><dt>Profile status</dt><dd>{profile.onboardingStatus.toLowerCase().replaceAll("_", " ")}</dd></div>
            <div><dt>Preferred contact</dt><dd>{profile.preferredContactMethod}</dd></div>
            <div><dt>Preferred contact time</dt><dd>{profile.preferredContactTime}</dd></div>
            <div><dt>Phone</dt><dd>{profile.phone ?? "Not provided"}</dd></div>
            <div><dt>Address</dt><dd>{[profile.addressLine1, profile.addressLine2, profile.city, profile.region, profile.postcode, profile.country].filter(Boolean).join(", ") || "Not provided"}</dd></div>
            <div><dt>Profile created</dt><dd>{new Date(profile.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</dd></div>
          </dl>
        </section>
        {context.permissions.includes("CLIENTS_MANAGE") ? <AdminClientCorrectionForm profile={profile} /> : <section className="admin-command-panel"><p className="eyebrow">Operational boundary</p><h2>Read-only client context</h2><p>Your access permits client visibility but not controlled profile corrections.</p></section>}
      </div>
      <section className="admin-section" aria-labelledby="client-claims-title">
        <div className="admin-section__heading"><div><p className="eyebrow">Associated claims</p><h2 id="client-claims-title">Claim record context</h2></div><span className="admin-muted-note">{profile.claims.length} claim{profile.claims.length === 1 ? "" : "s"}</span></div>
        {profile.claims.length ? <ol className="admin-operations-list">{profile.claims.map((claim) => <li className="admin-queue-item" key={claim.claimReference}><Link className="admin-queue-item__link" href={`/admin/claims/${claim.claimReference}`}><span><strong>{claim.claimReference}</strong><em>{claim.statusLabel} · {claim.stageLabel}</em></span><span className="admin-queue-item__state">{claim.priority}</span></Link><div className="admin-queue-item__meta"><span>{claim.assignee ? `Assigned to ${claim.assignee.displayName ?? claim.assignee.staffReference}` : "Unassigned"}</span><span>{claim.openActionCount ? `${claim.openActionCount} open client action${claim.openActionCount === 1 ? "" : "s"}` : "No open client actions"}</span><span>Updated {new Date(claim.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</span></div></li>)}</ol> : <div className="admin-empty"><p>No claims are associated with this client profile.</p></div>}
      </section>
      <section className="admin-section" aria-labelledby="client-assessments-title">
        <div className="admin-section__heading"><div><p className="eyebrow">Eligibility record</p><h2 id="client-assessments-title">Saved assessments</h2></div><span className="admin-muted-note">{assessments.length} assessment{assessments.length === 1 ? "" : "s"}</span></div>
        {assessments.length ? <ol className="admin-operations-list">{assessments.map((assessment) => <li className="admin-queue-item" key={assessment.assessmentReference}><Link className="admin-queue-item__link" href={`/admin/clients/${encodeURIComponent(profile.clientReference)}/assessments/${encodeURIComponent(assessment.assessmentReference)}`}><span><strong>{assessment.assessmentReference}</strong><em>{assessment.preliminaryOutcome?.replaceAll("_", " ") ?? assessment.status.replaceAll("_", " ")}</em></span><span className="admin-queue-item__state">{assessment.claimReference ? "Claim linked" : "No claim"}</span></Link><div className="admin-queue-item__meta"><span>{assessment.completedAt ? `Completed ${assessment.completedAt.toLocaleDateString("en-GB")}` : `Updated ${assessment.updatedAt.toLocaleDateString("en-GB")}`}</span></div></li>)}</ol> : <div className="admin-empty"><p>No eligibility assessments are associated with this client profile.</p></div>}
      </section>
    </div>
  );
}
