import Link from "next/link";

import { calculateReadingTime, type KnowledgeArticle } from "@/lib/knowledge-hub";

export function ArticleLink({ article, featured = false }: { article: KnowledgeArticle; featured?: boolean }) {
  return <Link className={`knowledge-article-link${featured ? " knowledge-article-link--featured" : ""}`} href={`/knowledge-hub/${article.slug}`}><span className="knowledge-article-link__meta">{article.category.replaceAll("-", " ")} <span aria-hidden="true">/</span> {calculateReadingTime(article)} min read</span><h3>{article.title}</h3><p>{article.excerpt}</p><span className="knowledge-article-link__footer"><time dateTime={article.updatedAt}>Updated {new Date(`${article.updatedAt}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</time><span aria-hidden="true">↗</span></span></Link>;
}
