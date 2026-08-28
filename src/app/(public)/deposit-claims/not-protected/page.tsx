import { IssuePage } from "@/components/public/issue-page";
import { createPublicMetadata, publicMetadata } from "@/config/public-site";
import { issuePages } from "@/content/public-site";
export const metadata = createPublicMetadata(...publicMetadata.notProtected, "/deposit-claims/not-protected");
export default function NotProtectedPage() { return <IssuePage content={issuePages.notProtected} breadcrumbLabel="Not protected" />; }
