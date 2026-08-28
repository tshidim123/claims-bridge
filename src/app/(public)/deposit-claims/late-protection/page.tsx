import { IssuePage } from "@/components/public/issue-page";
import { createPublicMetadata, publicMetadata } from "@/config/public-site";
import { issuePages } from "@/content/public-site";
export const metadata = createPublicMetadata(...publicMetadata.lateProtection, "/deposit-claims/late-protection");
export default function LateProtectionPage() { return <IssuePage content={issuePages.lateProtection} breadcrumbLabel="Late protection" />; }
