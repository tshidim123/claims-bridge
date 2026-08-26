import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.glossary;
export const metadata = createPageMetadata(content.title, content.description);

export default function GlossaryPage() {
  return <PageFoundation {...content} />;
}
