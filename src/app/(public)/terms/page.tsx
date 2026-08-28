import { TermsRoute } from "@/components/public/public-legal-routes";
import { createPublicMetadata } from "@/config/public-site";
export const metadata = createPublicMetadata("Claims Bridge terms", "A readable structure for website use, preliminary assessment, account access and the Claims Bridge claim workflow.", "/terms");
export default function TermsPage() { return <TermsRoute />; }
