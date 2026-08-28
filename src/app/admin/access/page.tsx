import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { staffRoleLabels, staffStatusLabels } from "@/config/staff";
import { getCurrentStaffContext } from "@/lib/staff/request";

export default async function AdminAccessPage() {
  const context = await getCurrentStaffContext();
  if (!context) return null;
  return <div className="admin-page"><AdminPageHeader eyebrow="Security & access / my access" title="Your operational access, clearly stated." description="This view reflects the active Claims Bridge staff record associated with your authenticated identity." /><section className="admin-access-layout" aria-label="Staff access summary"><div className="admin-identity-panel glass-surface glass-surface--strong"><div className="glass-surface__content"><p className="eyebrow">Staff reference</p><strong className="admin-reference">{context.staffReference}</strong><dl className="admin-detail-list"><div><dt>Display name</dt><dd>{context.displayName ?? "Not configured"}</dd></div><div><dt>Role</dt><dd>{staffRoleLabels[context.role]}</dd></div><div><dt>Status</dt><dd>{staffStatusLabels[context.status]}</dd></div></dl></div></div><div className="admin-permission-panel"><p className="eyebrow">Available capabilities</p><h2>What this role can access</h2><ul className="admin-permission-list">{context.permissions.map((permission) => <li key={permission}>{permission.replaceAll("_", " ").toLocaleLowerCase()}</li>)}</ul><p className="admin-muted-note">Permissions are resolved from the server-side role mapping. A visible navigation link is not the security boundary.</p></div></section></div>;
}
