import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleLink } from "@/components/knowledge-hub/article-link";
import { EditorialSection, PublicBreadcrumbs, PublicCta, PublicHero, RelatedResources } from "@/components/public/public-editorial";
import { editorialClusters } from "@/config/knowledge-hub";
import { createPublicMetadata } from "@/config/public-site";
import { knowledgeCategories, type KnowledgeCategorySlug } from "@/content/knowledge-hub";
import { getArticlesByCategory, getClusterArticles, getPopulatedCategories } from "@/lib/knowledge-hub";

export const dynamicParams = false;

export function generateStaticParams() {
  return getPopulatedCategories().map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const category = knowledgeCategories[(await params).slug as KnowledgeCategorySlug];
  if (!category) return { robots: { index: false, follow: false } };
  return createPublicMetadata(`${category.label} guidance`, category.description, `/knowledge-hub/category/${category.slug}`);
}

export default async function KnowledgeCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug as KnowledgeCategorySlug;
  const category = knowledgeCategories[slug];
  if (!category) notFound();
  const articles = getArticlesByCategory(slug);
  if (articles.length === 0) notFound();
  const cluster = editorialClusters.find((item) => item.category === slug);
  const clusterArticles = cluster ? getClusterArticles(cluster) : [];
  return <article className="public-page knowledge-category-page"><PublicHero eyebrow="Knowledge Hub / category" title={category.label} description={category.description} actions={[{ label: "Browse all guidance", href: "/knowledge-hub" }, { label: "Check eligibility", href: "/check-eligibility", variant: "secondary" }]} /><PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Knowledge Hub", href: "/knowledge-hub" }, { label: category.label }]} />{cluster && <EditorialSection eyebrow="Editorial route" title={cluster.title}><div className="knowledge-category-intro"><div><p>{cluster.description}</p><Link className="text-link" href={cluster.pillar.href}>{cluster.pillar.label} <span aria-hidden="true">↗</span></Link></div><RelatedResources links={cluster.relatedServiceRoutes.map((route) => ({ ...route, description: `Continue through the ${route.label.toLocaleLowerCase()} route.` }))} /></div></EditorialSection>}{clusterArticles.length > 0 && <EditorialSection eyebrow="Start with the pillar" title="A considered route into this topic."><div className="knowledge-category-featured">{clusterArticles.slice(0, 2).map((article) => <ArticleLink article={article} key={article.slug} featured />)}</div></EditorialSection>}<EditorialSection eyebrow={`${articles.length} published ${articles.length === 1 ? "article" : "articles"}`} title="Guidance in this topic."><div className="knowledge-index-grid">{articles.filter((article) => !clusterArticles.some((featuredArticle) => featuredArticle.slug === article.slug)).map((article) => <ArticleLink article={article} key={article.slug} />)}</div></EditorialSection><PublicCta /></article>;
}
