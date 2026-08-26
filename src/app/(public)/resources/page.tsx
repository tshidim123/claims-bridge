import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.resources;
export const metadata = createPageMetadata("Resources", content.description);

export default function ResourcesPage() {
  return <PageFoundation {...content} />;
}
