import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { staffRoleLabels } from "@/config/staff";
import type { StaffContext } from "@/lib/staff/authorization";
import { AdminNavigation } from "./admin-navigation";

export function AdminShell({ children, context }: { children: ReactNode; context: StaffContext }) {
 return <div className="admin-shell"><aside className="admin-sidebar glass-surface glass-surface--strong"><div className="glass-surface__content admin-sidebar__content"><Link href="/admin" className="admin-sidebar__brand"><BrandMark /><span>Operations workspace</span></Link><AdminNavigation context={context} /><div className="admin-sidebar__footer"><span className="admin-security-mark"><span aria-hidden="true" /> Authorised internal area</span><Link href="/account">Client account</Link><Link href="/">Public site</Link></div></div></aside><div className="admin-workspace"><header className="admin-topbar"><div><span className="eyebrow">Claims Bridge / Internal</span><strong>Operations workspace</strong></div><div className="admin-topbar__tools"><Link className="admin-topbar__search" href="/admin/search">Search operations <span aria-hidden="true">⌘K</span></Link><div className="admin-topbar__identity"><span>{context.displayName ?? "Claims Bridge staff"}</span><span className="admin-role-badge">{staffRoleLabels[context.role]}</span></div></div></header><details className="admin-mobile-navigation"><summary>Operations navigation <span aria-hidden="true">+</span></summary><div><AdminNavigation context={context} /></div></details><main className="admin-content" id="main-content" tabIndex={-1}>{children}</main></div></div>;
}
