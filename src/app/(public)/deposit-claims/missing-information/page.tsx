import { IssuePage } from "@/components/public/issue-page";
import { createPublicMetadata, publicMetadata } from "@/config/public-site";
import { issuePages } from "@/content/public-site";
export const metadata = createPublicMetadata(...publicMetadata.missingInformation, "/deposit-claims/missing-information");
export default function MissingInformationPage() { return <IssuePage content={issuePages.missingInformation} breadcrumbLabel="Missing information" />; }
