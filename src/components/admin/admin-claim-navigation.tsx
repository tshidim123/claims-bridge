import Link from "next/link";

import { hasPermissionForRole, type StaffPermission } from "@/config/staff";
import type { StaffContext } from "@/lib/staff/authorization";

const tabs = [
  { label: "Overview", segment: "", permission: "CLAIMS_VIEW" as StaffPermission },
  { label: "Client", segment: "client", permission: "CLIENTS_VIEW" as StaffPermission },
  { label: "Assessment", segment: "assessment", permission: "CLAIMS_VIEW" as StaffPermission },
  { label: "Timeline", segment: "timeline", permission: "CLAIMS_VIEW" as StaffPermission },
  { label: "Evidence", segment: "evidence", permission: "EVIDENCE_VIEW" as StaffPermission },
  { label: "Documents", segment: "documents", permission: "DOCUMENTS_VIEW" as StaffPermission },
  { label: "Messages", segment: "messages", permission: "MESSAGES_VIEW" as StaffPermission },
  { label: "Client actions", segment: "client-actions", permission: "CLAIMS_VIEW" as StaffPermission },
  { label: "Internal notes", segment: "notes", permission: "CLAIMS_MANAGE" as StaffPermission },
  { label: "Audit", segment: "audit", permission: "AUDIT_VIEW" as StaffPermission },
];

export function AdminClaimNavigation({ claimReference, context }: { claimReference: string; context: StaffContext }) {
  return <nav className="admin-case-navigation" aria-label="Claim workspace"><p className="eyebrow">Claim workspace</p><div>{tabs.filter((tab) => hasPermissionForRole(context.role, tab.permission)).map((tab) => <Link href={`/admin/claims/${encodeURIComponent(claimReference)}${tab.segment ? `/${tab.segment}` : ""}`} key={tab.label}>{tab.label}<span aria-hidden="true">↗</span></Link>)}</div></nav>;
}
