import { AccountPlaceholder } from "@/components/account/account-placeholder";
import { StatusArchitecture } from "@/components/claims/status-architecture";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getClientProfileByClerkId } from "@/lib/clients/repository";

export const metadata = { title: "Overview" };

export default async function AccountOverviewPage() {
  if (process.env.DATABASE_URL) {
    const { userId } = await auth();
    if (userId && !(await getClientProfileByClerkId(userId))) redirect("/account/onboarding");
  }
  return (
    <AccountPlaceholder
      title="Overview"
      description="Your Claims Bridge client workspace is ready for onboarding. Claims, documents and updates will be introduced in later phases."
    >
      <StatusArchitecture />
    </AccountPlaceholder>
  );
}
