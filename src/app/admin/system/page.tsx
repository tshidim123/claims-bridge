import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { CommunicationsHealth } from "@/components/admin/communications-health";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { getSystemStatus } from "@/lib/system/status";
import { getEmailMetrics } from "@/lib/communications/staff-operations";
import { getCurrentStaffContext } from "@/lib/staff/request";

export const metadata = {
  title: "System status",
  robots: { index: false, follow: false },
};

export default async function AdminSystemPage() {
  const context = await getCurrentStaffContext();
  if (!context?.permissions.includes("SETTINGS_VIEW"))
    return <AdminAccessDenied forbidden />;
  const [status, emailMetrics] = await Promise.all([
    getSystemStatus(),
    getEmailMetrics(),
  ]);
  const rows = [
    ["Authentication", status.authentication],
    ["Database configuration", status.database],
    ["Database reachability", status.databaseReachability],
    ["Private document storage", status.documentStorage],
    ["In-app messaging", status.messaging],
    ["In-app notifications", status.notifications],
    ["SMS delivery", status.sms],
    ["Push delivery", status.push],
    [
      "Canonical production URL",
      process.env.NEXT_PUBLIC_SITE_URL ? "Configured" : "Not configured",
    ],
  ] as const;
  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="Security & access / system"
        title="A safe view of platform readiness."
        description="Configuration presence and basic reachability only. Secrets, provider identifiers and infrastructure details are never rendered here."
      />
      <section
        className="admin-status-grid"
        aria-labelledby="system-status-title"
      >
        <h2 id="system-status-title">Integration status</h2>
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <CommunicationsHealth metrics={emailMetrics} />
      <section className="admin-command-panel admin-system-note">
        <p className="eyebrow">Governed configuration</p>
        <h2>Operational rules remain code-controlled.</h2>
        <p>
          Permissions, claim workflow, evidence rules and notification routing
          are not editable from this workspace. Changes require a reviewed
          code/configuration change.
        </p>
      </section>
    </div>
  );
}
