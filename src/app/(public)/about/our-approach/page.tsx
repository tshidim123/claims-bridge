import { PageFoundation } from "@/components/layout/page-foundation";
import { routeFoundations } from "@/content/route-foundations";
import { createPageMetadata } from "@/lib/metadata";

const content = routeFoundations.approach;
export const metadata = createPageMetadata("Our approach", content.description);

export default function OurApproachPage() {
  return <PageFoundation {...content} />;
}
