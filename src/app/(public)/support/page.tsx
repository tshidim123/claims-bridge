import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.support;
export const metadata = createPageMetadata("Support", content.description);

export default function SupportPage() {
  return <PageFoundation {...content} />;
}
