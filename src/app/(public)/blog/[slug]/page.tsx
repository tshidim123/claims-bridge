import type { Metadata } from "next";

import { PageFoundation } from "@/components/layout/page-foundation";
import { createPageMetadata } from "@/lib/metadata";

type BlogArticleFoundationProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...createPageMetadata(
      "Article foundation",
      "The individual Knowledge Hub article template is prepared for reviewed content and publication metadata.",
    ),
    robots: { index: false, follow: false },
  };
}

export default async function BlogArticleFoundationPage({ params }: BlogArticleFoundationProps) {
  const { slug } = await params;

  return (
    <PageFoundation
      eyebrow="Knowledge Hub article"
      title="Article template foundation"
      description={`The route “${slug}” is ready for reviewed article content. No author, reviewer, citations or publication dates have been invented.`}
      plannedSections={["Article header", "Author and reviewer metadata", "Published and updated dates", "Table of contents", "Reviewed article body", "Citations and resources", "Contextual eligibility route", "Related articles"]}
      links={[{ label: "Return to Knowledge Hub", href: "/blog" }, { label: "Browse resources", href: "/resources" }]}
    />
  );
}
