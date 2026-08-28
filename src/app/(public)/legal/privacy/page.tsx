import { PrivacyRoute } from "@/components/public/public-legal-routes";
import { createPublicMetadata } from "@/config/public-site";
export const metadata = createPublicMetadata("Privacy at Claims Bridge", "Understand the information and account concepts that a complete Claims Bridge privacy notice will cover.", "/privacy");

export default function PrivacyPage() {
  return <PrivacyRoute />;
}
