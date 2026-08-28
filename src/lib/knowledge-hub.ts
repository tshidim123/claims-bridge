import { knowledgeArticles, knowledgeCategories, knowledgeTopics, type ArticleBlock, type KnowledgeArticle, type KnowledgeCategorySlug } from "@/content/knowledge-hub";
import { editorialClusters, type EditorialCluster } from "@/config/knowledge-hub";
import { publicRoutePaths } from "@/config/public-site";

export type { KnowledgeArticle } from "@/content/knowledge-hub";

export type FreshnessState = "CURRENT" | "REVIEW_DUE" | "OVERDUE";

export type EditorialAudit = {
  publishedCount: number;
  draftCount: number;
  reviewCount: number;
  legalReviewRequiredCount: number;
  reviewDueCount: number;
  brokenReferenceCount: number;
  errors: readonly string[];
};

export type ArticleHeading = { text: string; id: string; level: 2 | 3 };

const MAX_EDITORIAL_ARTICLES = 30;
const REVIEW_DUE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function getBlockText(block: ArticleBlock): string {
  if (block.type === "paragraph" || block.type === "heading") return block.text;
  if (block.type === "callout") return block.text;
  if (block.type === "definition") return `${block.term} ${block.definition}`;
  return block.items.join(" ");
}

export function getPublishedArticles(): readonly KnowledgeArticle[] {
  assertKnowledgeContentValid();
  return knowledgeArticles.filter((article) => article.status === "PUBLISHED");
}

export function getArticleBySlug(slug: string): KnowledgeArticle | undefined {
  return getPublishedArticles().find((article) => article.slug === slug);
}

export function getArticleBySlugIncludingUnpublished(slug: string): KnowledgeArticle | undefined {
  return knowledgeArticles.find((article) => article.slug === slug);
}

export function getArticlesByCategory(category: KnowledgeCategorySlug): readonly KnowledgeArticle[] {
  return getPublishedArticles().filter((article) => article.category === category);
}

export function getPopulatedCategories() {
  return Object.values(knowledgeCategories).filter((category) => getArticlesByCategory(category.slug).length > 0);
}

function scoreArticleMatch(article: KnowledgeArticle, query: string): number {
  const title = normalized(article.title);
  const excerpt = normalized(article.excerpt);
  const description = normalized(article.description);
  const category = normalized(article.category);
  const topics = article.topics.map(normalized);
  const body = article.body.map(getBlockText).join(" ").toLocaleLowerCase();
  let score = 0;
  if (title === query) score += 160;
  if (title.includes(query)) score += 100;
  if (topics.some((topic) => topic === query)) score += 80;
  if (topics.some((topic) => topic.includes(query))) score += 55;
  if (category === query) score += 50;
  if (category.includes(query)) score += 35;
  if (excerpt.includes(query)) score += 30;
  if (description.includes(query)) score += 25;
  if (body.includes(query)) score += 10;
  return score;
}

export function searchKnowledgeArticles(query: string): readonly KnowledgeArticle[] {
  const normalizedQuery = normalized(query);
  const articles = getPublishedArticles();
  if (!normalizedQuery) return articles;
  return articles
    .map((article, index) => ({ article, index, score: scoreArticleMatch(article, normalizedQuery) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => result.article);
}

export function calculateReadingTime(article: KnowledgeArticle): number {
  const words = article.body.map(getBlockText).join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function slugifyHeading(text: string): string {
  return normalized(text).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

export function getArticleHeadingIds(article: KnowledgeArticle): readonly ArticleHeading[] {
  const seen = new Map<string, number>();
  return article.body.flatMap((block) => {
    if (block.type !== "heading") return [];
    const base = slugifyHeading(block.text);
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return [{ text: block.text, id: occurrence === 0 ? base : `${base}-${occurrence + 1}`, level: block.level }];
  });
}

export function getArticleToc(article: KnowledgeArticle): readonly ArticleHeading[] {
  return getArticleHeadingIds(article).filter((heading) => heading.level === 2);
}

export function getArticleBreadcrumbs(article: KnowledgeArticle) {
  return [{ label: "Home", href: "/" }, { label: "Knowledge Hub", href: "/knowledge-hub" }, { label: knowledgeCategories[article.category].label, href: `/knowledge-hub/category/${article.category}` }, { label: article.title }];
}

export function getClusterForArticle(article: KnowledgeArticle): EditorialCluster | undefined {
  return editorialClusters.find((cluster) => cluster.category === article.category);
}

export function getClusterArticles(cluster: EditorialCluster): readonly KnowledgeArticle[] {
  const published = getPublishedArticles();
  return cluster.featuredArticles.map((slug) => published.find((article) => article.slug === slug)).filter((article): article is KnowledgeArticle => Boolean(article));
}

export function getRelatedArticles(article: KnowledgeArticle): readonly KnowledgeArticle[] {
  const published = getPublishedArticles().filter((candidate) => candidate.slug !== article.slug);
  const explicit = article.relatedSlugs.map((slug) => published.find((candidate) => candidate.slug === slug)).filter((candidate): candidate is KnowledgeArticle => Boolean(candidate));
  const selected = new Set(explicit.map((candidate) => candidate.slug));
  const cluster = getClusterForArticle(article);
  const fallback = published
    .filter((candidate) => !selected.has(candidate.slug))
    .map((candidate, index) => {
      const sharedTopics = candidate.topics.filter((topic) => article.topics.some((item) => normalized(item) === normalized(topic))).length;
      const sameCluster = cluster?.category === candidate.category;
      const samePurpose = candidate.purpose === article.purpose;
      return { candidate, index, score: (sameCluster ? 35 : 0) + sharedTopics * 20 + (samePurpose ? 3 : 0) };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => result.candidate);
  return [...explicit, ...fallback].slice(0, 3);
}

export function getFreshnessState(article: KnowledgeArticle, asOf = new Date()): FreshnessState {
  const nextReview = Date.parse(article.nextReviewAt);
  if (!Number.isFinite(nextReview)) return "REVIEW_DUE";
  if (asOf.getTime() > nextReview) return "OVERDUE";
  if (nextReview - asOf.getTime() <= REVIEW_DUE_WINDOW_MS) return "REVIEW_DUE";
  return "CURRENT";
}

function isKnownPublicPath(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/account") || href.startsWith("/api")) return false;
  if (publicRoutePaths.includes(href as (typeof publicRoutePaths)[number])) return true;
  if (href === "/guides/deposit-protection") return true;
  if (href.startsWith("/knowledge-hub/category/")) {
    const category = href.split("/").pop();
    return Boolean(category && Object.prototype.hasOwnProperty.call(knowledgeCategories, category));
  }
  if (href.startsWith("/knowledge-hub/")) return knowledgeArticles.some((article) => `/knowledge-hub/${article.slug}` === href);
  return false;
}

function validateReferences(article: KnowledgeArticle, errors: string[]): void {
  for (const slug of article.relatedSlugs) {
    const target = knowledgeArticles.find((candidate) => candidate.slug === slug);
    if (!target) errors.push(`${article.slug}: related article does not exist (${slug})`);
    if (article.status === "PUBLISHED" && target && target.status !== "PUBLISHED") errors.push(`${article.slug}: published article references unpublished content (${slug})`);
  }
  for (const link of article.serviceLinks) if (!isKnownPublicPath(link.href)) errors.push(`${article.slug}: invalid public service link (${link.href})`);
}

export function getEditorialAudit(asOf = new Date()): EditorialAudit {
  const errors: string[] = [];
  const slugs = new Set<string>();
  const titles = new Set<string>();
  let legalReviewRequiredCount = 0;
  let reviewDueCount = 0;
  if (knowledgeArticles.length > MAX_EDITORIAL_ARTICLES) errors.push(`Article count exceeds the controlled limit of ${MAX_EDITORIAL_ARTICLES}.`);
  for (const article of knowledgeArticles) {
    if (slugs.has(article.slug)) errors.push(`Duplicate article slug: ${article.slug}`);
    slugs.add(article.slug);
    if (article.status === "PUBLISHED" && titles.has(article.title)) errors.push(`Duplicate published article title: ${article.title}`);
    if (article.status === "PUBLISHED") titles.add(article.title);
    if (!Object.prototype.hasOwnProperty.call(knowledgeCategories, article.category)) errors.push(`${article.slug}: invalid category`);
    for (const topic of article.topics) if (!knowledgeTopics.includes(topic as (typeof knowledgeTopics)[number])) errors.push(`${article.slug}: invalid topic (${topic})`);
    if (!article.title || !article.description || !article.excerpt || !article.author || !article.publishedAt || !article.updatedAt || article.body.length === 0) errors.push(`${article.slug}: missing required editorial metadata`);
    const publishedAt = Date.parse(article.publishedAt);
    const updatedAt = Date.parse(article.updatedAt);
    if (!Number.isFinite(publishedAt) || !Number.isFinite(updatedAt) || updatedAt < publishedAt) errors.push(`${article.slug}: invalid publication dates`);
    if (article.status === "PUBLISHED" && article.contentRisk === "HIGH" && article.legalReview !== "REVIEWED") errors.push(`${article.slug}: high-risk published content requires REVIEWED legal status`);
    if (article.featured && article.status !== "PUBLISHED") errors.push(`${article.slug}: only published articles can be featured`);
    if (article.status === "PUBLISHED" && article.legalReview === "REVIEW_REQUIRED") legalReviewRequiredCount += 1;
    if (article.status === "PUBLISHED" && getFreshnessState(article, asOf) !== "CURRENT") reviewDueCount += 1;
    validateReferences(article, errors);
  }
  for (const cluster of editorialClusters) {
    if (!isKnownPublicPath(cluster.pillar.href)) errors.push(`${cluster.id}: invalid pillar route (${cluster.pillar.href})`);
    for (const slug of cluster.featuredArticles) {
      const article = knowledgeArticles.find((candidate) => candidate.slug === slug);
      if (!article || article.status !== "PUBLISHED") errors.push(`${cluster.id}: featured article is not published (${slug})`);
    }
    for (const route of cluster.relatedServiceRoutes) if (!isKnownPublicPath(route.href)) errors.push(`${cluster.id}: invalid service route (${route.href})`);
  }
  const brokenReferenceCount = errors.filter((error) => error.includes("link") || error.includes("route") || error.includes("article does not exist") || error.includes("unpublished content") || error.includes("pillar")).length;
  return {
    publishedCount: knowledgeArticles.filter((article) => article.status === "PUBLISHED").length,
    draftCount: knowledgeArticles.filter((article) => article.status === "DRAFT").length,
    reviewCount: knowledgeArticles.filter((article) => article.status === "REVIEW").length,
    legalReviewRequiredCount,
    reviewDueCount,
    brokenReferenceCount,
    errors,
  };
}

export function assertKnowledgeContentValid(): void {
  const audit = getEditorialAudit();
  if (audit.errors.length > 0) throw new Error(`Knowledge Hub content validation failed:\n${audit.errors.join("\n")}`);
}

export function getArticleStructuredData(article: KnowledgeArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: { "@type": "Organization", name: article.author },
    publisher: { "@type": "Organization", name: "Claims Bridge" },
    mainEntityOfPage: `/knowledge-hub/${article.slug}`,
  };
}

export function getKnowledgeHubStaticParams() {
  return getPublishedArticles().map((article) => ({ slug: article.slug }));
}
