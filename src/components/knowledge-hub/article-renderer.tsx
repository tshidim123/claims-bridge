import Link from "next/link";

import { ArticleLink } from "@/components/knowledge-hub/article-link";
import { PublicBreadcrumbs, PublicCta, RelatedResources, ScopeNotice, StructuredData } from "@/components/public/public-editorial";
import { publicDisclosures } from "@/config/public-trust";
import { knowledgeCategories, type KnowledgeArticle } from "@/content/knowledge-hub";
import { calculateReadingTime, getArticleBreadcrumbs, getArticleHeadingIds, getArticleStructuredData, getArticleToc, getClusterForArticle, getRelatedArticles } from "@/lib/knowledge-hub";

export function ArticleRenderer({ article }: { article: KnowledgeArticle }) {
  const category = knowledgeCategories[article.category];
  const cluster = getClusterForArticle(article);
  const related = getRelatedArticles(article);
  const headingIds = getArticleHeadingIds(article);
  const toc = getArticleToc(article);
  const showToc = toc.length >= 3;
  let headingCursor = 0;

  return <article className="knowledge-article">
    <StructuredData data={getArticleStructuredData(article)} />
    <header className="knowledge-article__header">
      <PublicBreadcrumbs items={getArticleBreadcrumbs(article)} />
      <div className="application-container">
        <p className="eyebrow">{category.label} / Knowledge Hub</p>
        <h1>{article.title}</h1>
        <p className="knowledge-article__standfirst">{article.description}</p>
        <div className="knowledge-article__byline">
          <span>By {article.author}</span><span aria-hidden="true">·</span>
          <time dateTime={article.publishedAt}>Published {new Date(`${article.publishedAt}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
          <span aria-hidden="true">·</span><span>{calculateReadingTime(article)} min read</span>
          {article.updatedAt !== article.publishedAt && <><span aria-hidden="true">·</span><time dateTime={article.updatedAt}>Updated {article.updatedAt}</time></>}
        </div>
      </div>
    </header>
    <div className="application-container knowledge-article__layout">
      <div className="knowledge-article__body">
        {article.body.map((block, index) => {
          if (block.type === "heading") {
            const Heading = block.level === 2 ? "h2" : "h3";
            const heading = headingIds[headingCursor++];
            return <Heading id={heading?.id} key={`${block.type}-${index}`}>{block.text}</Heading>;
          }
          if (block.type === "list") return <ul key={`${block.type}-${index}`}>{block.items.map((item) => <li key={item}>{item}</li>)}</ul>;
          if (block.type === "checklist") return <ul className="knowledge-checklist" aria-label="Checklist" key={`${block.type}-${index}`}>{block.items.map((item) => <li key={item}><span aria-hidden="true">□</span>{item}</li>)}</ul>;
          if (block.type === "definition") return <dl className="knowledge-definition" key={`${block.type}-${index}`}><dt>{block.term}</dt><dd>{block.definition}</dd></dl>;
          if (block.type === "callout") return <aside className="knowledge-callout" key={`${block.type}-${index}`}><p className="eyebrow">{block.label}</p><p>{block.text}</p></aside>;
          return <p key={`${block.type}-${index}`}>{block.text}</p>;
        })}
      </div>
      <aside className="knowledge-article__aside">
        {showToc && <nav className="knowledge-article__toc" aria-label="Article contents"><span className="eyebrow">In this article</span><ol>{toc.map((heading) => <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}</ol></nav>}
        <div className="knowledge-article__aside-panel"><span className="eyebrow">The wider route</span><p>{category.description}</p><Link className="text-link" href={`/knowledge-hub/category/${article.category}`}>Explore {category.label} <span aria-hidden="true">↗</span></Link></div>
        {cluster && <div className="knowledge-article__aside-panel"><span className="eyebrow">Pillar resource</span><p>{cluster.description}</p><Link className="text-link" href={cluster.pillar.href}>{cluster.pillar.label} <span aria-hidden="true">↗</span></Link></div>}
        <ScopeNotice title="Keep the distinction clear">{publicDisclosures.preliminary.text}</ScopeNotice>
      </aside>
    </div>
    {article.serviceLinks.length > 0 && <section className="knowledge-article__continuation"><div className="application-container"><p className="eyebrow">Useful next routes</p><h2>Continue with the part that matters to you.</h2><RelatedResources links={article.serviceLinks} /></div></section>}
    {related.length > 0 && <section className="knowledge-article__continuation knowledge-article__continuation--related"><div className="application-container"><p className="eyebrow">Related reading</p><h2>Keep exploring the topic.</h2><div className="knowledge-related-grid">{related.map((relatedArticle) => <ArticleLink article={relatedArticle} key={relatedArticle.slug} />)}</div></div></section>}
    <PublicCta title="Ready to check your own circumstances?" description="If you are unsure whether your situation may warrant further review, start with a preliminary eligibility assessment." />
  </article>;
}
