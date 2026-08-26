import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.cookies;
export const metadata = createPageMetadata(content.title, content.description);

export default function CookiesPage() {
  return <PageFoundation {...content} />;
}
