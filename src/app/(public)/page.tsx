import { HomeFoundation } from "@/components/layout/home-foundation";
import { createPageMetadata } from "@/lib/metadata";

const homepageDescription =
  "Understand whether the way your tenancy deposit was handled may warrant further assessment, then organise evidence and follow each next step with Claims Bridge.";

export const metadata = createPageMetadata(
  "Tenancy deposit claims, made clearer",
  homepageDescription,
  { canonicalPath: "/" },
);

export default function HomePage() {
  return <HomeFoundation />;
}
