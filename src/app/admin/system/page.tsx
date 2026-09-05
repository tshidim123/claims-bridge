import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
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
    ["Email delivery", status.email],
    ["SMS delivery", status.sms],
    ["Push delivery", status.push],
    [
      "Canonical production URL",
      process.env.NEXT_PUBLIC_SITE_URL ? "Configured" : "Not configured",
    ],
  ] as const;
  const metric = new Map(
    emailMetrics.rows.map((item) => [item.status, Number(item.count)]),
  );
  const provider = Boolean(
    process.env.RESEND_API_KEY && process.env.CLAIMS_BRIDGE_FROM_EMAIL,
  );
  const sender = Boolean(process.env.CLAIMS_BRIDGE_FROM_EMAIL);
  const replyTo = Boolean(process.env.CLAIMS_BRIDGE_REPLY_TO);
  const webhook = Boolean(process.env.RESEND_WEBHOOK_SECRET);
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
      <section
        className="admin-status-grid"
        aria-labelledby="communications-status-title"
      >
        <h2 id="communications-status-title">Communications</h2>
        <p>
          {provider
            ? metric.get("FAILED")
              ? "Some transactional communications require attention."
              : "Transactional communication delivery is configured."
            : "Transactional email delivery is currently inactive."}
        </p>
        <dl>
          {[
            [
              "Transactional email provider",
              provider ? "Configured" : "Not configured",
            ],
            ["Sender identity", sender ? "Configured" : "Not configured"],
            ["Reply-to", replyTo ? "Configured" : "Not configured"],
            [
              "Delivery webhook verification",
              webhook ? "Configured" : "Not configured",
            ],
            ["Pending", metric.get("PENDING") ?? 0],
            ["Retry", metric.get("RETRY") ?? 0],
            ["Failed", metric.get("FAILED") ?? 0],
            ["Suppressed", metric.get("SUPPRESSED") ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p>
          {webhook
            ? "Provider delivery tracking is configured."
            : "Provider delivery tracking is unavailable."}
        </p>
      </section>
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
