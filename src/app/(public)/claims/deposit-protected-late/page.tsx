import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.depositProtectedLate;
export const metadata = createPageMetadata(content.title, content.description);

export default function DepositProtectedLatePage() {
  return <PageFoundation {...content} />;
}
