import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentStaffContext } from "@/lib/staff/request";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  let context: Awaited<ReturnType<typeof getCurrentStaffContext>> = null;

  try {
    context = await getCurrentStaffContext();
  } catch {
    context = null;
  }

  if (!context) return <AdminAccessDenied />;
  return <AdminShell context={context}>{children}</AdminShell>;
}
