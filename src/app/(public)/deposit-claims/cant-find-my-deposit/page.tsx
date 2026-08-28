import { IssuePage } from "@/components/public/issue-page";
import { createPublicMetadata, publicMetadata } from "@/config/public-site";
import { issuePages } from "@/content/public-site";
export const metadata = createPublicMetadata(...publicMetadata.cantFindDeposit, "/deposit-claims/cant-find-my-deposit");
export default function CantFindMyDepositPage() { return <IssuePage content={issuePages.cantFindDeposit} breadcrumbLabel="Cannot find my deposit" />; }
