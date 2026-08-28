import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AuditEventRow } from "@/components/admin/audit-event-row";
import { staffAuditActions } from "@/config/staff";
import { getCurrentStaffContext } from "@/lib/staff/request";
import { getStaffAuditExplorer } from "@/lib/staff/repository";

export const metadata = { title: "Audit explorer", robots: { index: false, follow: false } };
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getCurrentStaffContext();
  if (!context?.permissions.includes("AUDIT_VIEW")) return <AdminAccessDenied forbidden />;
  const raw = await searchParams;
  const filters = { action: one(raw.action), actor: one(raw.actor), targetType: one(raw.targetType), targetReference: one(raw.targetReference), from: one(raw.from), to: one(raw.to), before: one(raw.before) };
  let audit;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  try { audit = await getStaffAuditExplorer(userId, filters); } catch { return <AdminAccessDenied forbidden />; }
  const params = new URLSearchParams(); for (const [key, value] of Object.entries(filters)) if (value && key !== "before") params.set(key, value);
  return <div className="admin-page"><AdminPageHeader eyebrow="Security & access / audit" title="An append-oriented operational trail." description="Filter safe structured fields from recorded staff operations. Audit history cannot be edited, deleted or searched by private message, note or document content." /><form className="admin-audit-filters" method="get" aria-label="Filter audit events"><label>Action<select name="action" defaultValue={filters.action ?? ""}><option value="">All actions</option>{staffAuditActions.map((action) => <option value={action} key={action}>{action.replaceAll("_", " ")}</option>)}</select></label><label>Actor reference<input name="actor" defaultValue={filters.actor ?? ""} maxLength={40} placeholder="CB-STF-…" /></label><label>Target type<select name="targetType" defaultValue={filters.targetType ?? ""}><option value="">All targets</option>{["STAFF_USER", "CLAIM", "CLIENT", "EVIDENCE_REQUIREMENT", "DOCUMENT", "CONVERSATION", "ACTION"].map((type) => <option value={type} key={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label>Target reference<input name="targetReference" defaultValue={filters.targetReference ?? ""} maxLength={100} /></label><label>From<input name="from" type="date" defaultValue={filters.from ?? ""} /></label><label>To<input name="to" type="date" defaultValue={filters.to ?? ""} /></label><div><button className="button button--small button--primary" type="submit">Filter audit</button><Link className="button button--small button--quiet" href="/admin/audit">Clear</Link></div></form>{audit.events.length > 0 ? <ol className="admin-audit-list" aria-label="Filtered staff audit events">{audit.events.map((event, index) => <AuditEventRow event={event} key={`${event.createdAt}-${event.action}-${index}`} />)}</ol> : <div className="admin-empty admin-empty--large"><p className="eyebrow">No matching audit events</p><h2>The audit trail is clear for this view.</h2><p>Recorded staff operations will appear here when they occur.</p></div>}{audit.nextCursor && <div className="admin-queue-pagination"><span>Showing the latest audit activity</span><Link className="button button--small button--quiet" href={`/admin/audit?${params.toString()}&before=${encodeURIComponent(audit.nextCursor)}`}>Load earlier</Link></div>}</div>;
}
