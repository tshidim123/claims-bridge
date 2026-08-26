import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.blog;
export const metadata = createPageMetadata("Knowledge Hub", content.description);

export default function BlogPage() {
  return <PageFoundation {...content} />;
}
