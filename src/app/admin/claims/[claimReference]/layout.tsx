import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminClaimNavigation } from "@/components/admin/admin-claim-navigation";
import { requireStaff } from "@/lib/staff/authorization";

export default async function AdminClaimLayout({ children, params }: { children: ReactNode; params: Promise<{ claimReference: string }> }) {
  const { claimReference } = await params;
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  let context;
  try { context = await requireStaff(userId); } catch { return <AdminAccessDenied forbidden />; }
  return <div className="admin-case-page"><div className="admin-case-heading"><AdminClaimNavigation claimReference={claimReference} context={context} /></div>{children}</div>;
}
