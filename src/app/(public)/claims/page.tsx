import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.claims;
export const metadata = createPageMetadata("Deposit protection issues", content.description);

export default function ClaimsPage() {
  return <PageFoundation {...content} />;
}
