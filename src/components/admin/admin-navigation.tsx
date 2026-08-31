import Link from "next/link";

import { hasPermissionForRole, type StaffPermission } from "@/config/staff";
import type { StaffContext } from "@/lib/staff/authorization";

const sections: ReadonlyArray<{ label: string; items: ReadonlyArray<{ label: string; href: string; permission: StaffPermission }> }> = [
  { label: "Operations", items: [
    { label: "Overview", href: "/admin", permission: "ADMIN_ACCESS" },
    { label: "Leads", href: "/admin/leads", permission: "CLIENTS_VIEW" },
    { label: "Assessments", href: "/admin/assessments", permission: "CLIENTS_VIEW" },
    { label: "Claims", href: "/admin/claims", permission: "CLAIMS_VIEW" },
    { label: "Messages", href: "/admin/messages", permission: "MESSAGES_VIEW" },
    { label: "Evidence", href: "/admin/evidence", permission: "EVIDENCE_VIEW" },
    { label: "Documents", href: "/admin/documents", permission: "DOCUMENTS_VIEW" },
    { label: "Client actions", href: "/admin/client-actions", permission: "CLAIMS_VIEW" },
    { label: "Clients", href: "/admin/clients", permission: "CLIENTS_VIEW" },
  ] },
  { label: "Security & access", items: [
    { label: "My access", href: "/admin/access", permission: "ADMIN_ACCESS" },
    { label: "Team", href: "/admin/team", permission: "STAFF_VIEW" },
    { label: "Audit", href: "/admin/audit", permission: "AUDIT_VIEW" },
    { label: "System", href: "/admin/system", permission: "SETTINGS_VIEW" },
  ] },
];

export function AdminNavigation({ context }: { context: StaffContext }) {
  return <nav className="admin-navigation" aria-label="Operations workspace">{sections.map((section) => <div className="admin-navigation__section" key={section.label}><p className="eyebrow">{section.label}</p>{section.items.map((item) => hasPermissionForRole(context.role, item.permission) && <Link href={item.href} key={item.href}><span>{item.label}</span><span aria-hidden="true">↗</span></Link>)}</div>)}</nav>;
}
