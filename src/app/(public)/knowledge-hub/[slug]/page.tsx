import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleRenderer } from "@/components/knowledge-hub/article-renderer";
import { createPublicMetadata } from "@/config/public-site";
import { getArticleBySlug, getKnowledgeHubStaticParams } from "@/lib/knowledge-hub";

export const dynamicParams = false;

export function generateStaticParams() {
  return getKnowledgeHubStaticParams();
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = getArticleBySlug((await params).slug);
  if (!article) return { robots: { index: false, follow: false } };
  return { ...createPublicMetadata(article.title, article.description, `/knowledge-hub/${article.slug}`), openGraph: { ...createPublicMetadata(article.title, article.description, `/knowledge-hub/${article.slug}`).openGraph, type: "article", publishedTime: article.publishedAt, modifiedTime: article.updatedAt, authors: [article.author] } };
}

export default async function KnowledgeArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticleBySlug((await params).slug);
  if (!article) notFound();
  return <ArticleRenderer article={article} />;
}
