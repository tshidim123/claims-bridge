import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminStaffProvisioningForm, AdminStaffRowActions } from "@/components/admin/admin-staff-management";
import { staffRoleLabels, staffStatusLabels } from "@/config/staff";
import { getStaffWorkload } from "@/lib/admin/operations/repository";
import { getCurrentStaffPermission } from "@/lib/staff/request";
import { getStaffDirectory } from "@/lib/staff/repository";
import { auth } from "@clerk/nextjs/server";

export const metadata = { title: "Team access", robots: { index: false, follow: false } };

export default async function AdminTeamPage() {
  let context;
  try { context = await getCurrentStaffPermission("STAFF_VIEW"); } catch { context = null; }
  if (!context) return <AdminAccessDenied forbidden />;
  const { userId } = await auth();
  const staff = await getStaffDirectory();
  const workload = context.permissions.includes("CLAIMS_VIEW") && userId ? await getStaffWorkload(userId) : [];
  const workloadMap = new Map(workload.map((item) => [item.staffReference, item]));
  return <div className="admin-page"><AdminPageHeader eyebrow="Security & access / team" title="The authorised staff directory." description="Persisted Claims Bridge staff access, with controlled provisioning and allocation context. Workload figures describe allocation only, not performance." />{context.permissions.includes("STAFF_MANAGE") && <AdminStaffProvisioningForm />}{staff.length > 0 ? <ul className="admin-team-list" aria-label="Claims Bridge staff directory">{staff.map((member) => { const allocation = workloadMap.get(member.staffReference); return <li key={member.staffReference}><strong>{member.displayName ?? "Claims Bridge staff"}</strong><span>{member.staffReference}</span><span>{staffRoleLabels[member.role]}</span><span className={member.status === "ACTIVE" ? "admin-status admin-status--active" : "admin-status"}>{staffStatusLabels[member.status]}</span>{allocation && <span className="admin-team-workload">{allocation.assignedActiveClaims} active claims · {allocation.needsAttention} needs attention</span>}<time dateTime={member.createdAt.toISOString()}>Joined {member.createdAt.toLocaleDateString("en-GB", { dateStyle: "medium" })}</time>{context.permissions.includes("STAFF_MANAGE") && <AdminStaffRowActions staffReference={member.staffReference} displayName={member.displayName} role={member.role} status={member.status} />}</li>; })}</ul> : <div className="admin-empty admin-empty--large"><p className="eyebrow">No staff records</p><h2>The directory is empty.</h2><p>No staff identities have been registered yet. The initial super admin must be created through the protected bootstrap command.</p></div>}</div>;
}
