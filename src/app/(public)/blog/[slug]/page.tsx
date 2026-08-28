import { notFound, redirect } from "next/navigation";

import { getArticleBySlug } from "@/lib/knowledge-hub";

type BlogArticleProps = { params: Promise<{ slug: string }> };

export default async function BlogArticlePage({ params }: BlogArticleProps) {
  const { slug } = await params;
  if (!getArticleBySlug(slug)) notFound();
  redirect(`/knowledge-hub/${encodeURIComponent(slug)}`);
}
