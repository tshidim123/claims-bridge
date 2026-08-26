import { AccountPlaceholder } from "@/components/account/account-placeholder";
import { StatusArchitecture } from "@/components/claims/status-architecture";

export const metadata = { title: "Overview" };

export default function AccountOverviewPage() {
  return (
    <AccountPlaceholder
      title="Overview"
      description="The account home is prepared for active claims, next actions, document requests, messages and important updates. No authentication or live client data is connected during Phase 1A."
    >
      <StatusArchitecture />
    </AccountPlaceholder>
  );
}
