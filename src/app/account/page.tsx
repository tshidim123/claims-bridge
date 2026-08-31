import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountPageHeader } from "@/components/account/account-page-header";
import { AccountPlaceholder } from "@/components/account/account-placeholder";
import { DashboardCommandCentre } from "@/components/dashboard/dashboard-command-centre";
import { getClientDashboard } from "@/lib/dashboard/service";

export const metadata = { title: "Overview" };

export default async function AccountOverviewPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount");
  if (!process.env.DATABASE_URL) return <AccountPlaceholder title="Overview" description="Your Claims Bridge client workspace is temporarily unavailable because account data is not configured in this environment." />;
  let dashboard;
  try {
    dashboard = await getClientDashboard(userId);
  } catch { dashboard = undefined; }
  if (!dashboard) return <div className="account-page"><AccountPageHeader title="Overview unavailable" description="We couldn't load your client command centre just now. Your claim data has not been affected. Please try again shortly." /></div>;
  if (!dashboard.client) redirect("/account/onboarding");
  return <DashboardCommandCentre dashboard={dashboard} />;
}
