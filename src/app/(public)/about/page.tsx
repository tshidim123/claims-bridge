import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.about;
export const metadata = createPageMetadata("About Claims Bridge", content.description);

export default function AboutPage() {
  return <PageFoundation {...content} />;
}
