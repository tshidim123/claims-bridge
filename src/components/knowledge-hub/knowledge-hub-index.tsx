import Link from "next/link";

import { ArticleLink } from "@/components/knowledge-hub/article-link";
import { EditorialSection, PublicCta, PublicHero, RelatedResources } from "@/components/public/public-editorial";
import { editorialClusters, knowledgeHubConcerns, type EditorialCluster } from "@/config/knowledge-hub";
import { publicCtas } from "@/config/public-site";
import { knowledgeCategories } from "@/content/knowledge-hub";
import { getClusterArticles, getPublishedArticles, searchKnowledgeArticles } from "@/lib/knowledge-hub";

function ClusterRail({ cluster }: { cluster: EditorialCluster }) {
  const articles = getClusterArticles(cluster);
  return <article className="knowledge-cluster"><div><p className="eyebrow">{String(cluster.sortOrder).padStart(2, "0")} / Cluster</p><h3>{cluster.title}</h3><p>{cluster.description}</p></div><div className="knowledge-cluster__links"><Link className="text-link" href={cluster.pillar.href}>{cluster.pillar.label} <span aria-hidden="true">↗</span></Link>{articles.slice(0, 2).map((article) => <Link href={`/knowledge-hub/${article.slug}`} key={article.slug}>{article.title}<span aria-hidden="true">↗</span></Link>)}</div></article>;
}

export function KnowledgeHubIndex({ query }: { query: string }) {
  const articles = searchKnowledgeArticles(query);
  const featured = getPublishedArticles().find((article) => article.featured);
  const latest = articles.filter((article) => article.slug !== featured?.slug);
  return <article className="public-page knowledge-hub-page">
    <PublicHero eyebrow="Knowledge Hub" title="Useful guidance for the questions behind the paperwork." description="Read clear, qualified explainers about deposit protection, evidence, eligibility and the Claims Bridge process." actions={[publicCtas.checkEligibility, { label: "Explore deposit claims", href: "/deposit-claims", variant: "secondary" }]} />
    <EditorialSection eyebrow="Search the library" title="Start with a question, not a keyword cloud."><form className="knowledge-search" method="get" role="search"><label htmlFor="knowledge-query">Search Knowledge Hub</label><div><input id="knowledge-query" name="query" type="search" defaultValue={query} placeholder="Try “deposit protection”" /><button className="button button--medium button--primary" type="submit"><span className="button__label">Search</span></button>{query && <Link className="text-link" href="/knowledge-hub">Clear search</Link>}</div>{query && <p className="knowledge-search__result" aria-live="polite">{articles.length} {articles.length === 1 ? "article" : "articles"} found for “{query}”.</p>}</form></EditorialSection>
    <EditorialSection eyebrow={query ? "Search results" : "Start here"} title={query ? "Guidance matched to your search." : "A considered library, kept intentionally small."}>{articles.length === 0 ? <div className="knowledge-empty"><p className="eyebrow">No exact guidance found</p><h3>Try a broader question.</h3><p>Search by topic, category or a phrase from the question you are trying to answer.</p><div className="knowledge-empty__links"><Link className="text-link" href="/knowledge-hub">View all guidance <span aria-hidden="true">↗</span></Link><Link className="text-link" href="/support">Visit Support <span aria-hidden="true">↗</span></Link></div></div> : <div className="knowledge-index-grid">{!query && featured && <ArticleLink article={featured} featured />}{latest.map((article) => <ArticleLink article={article} key={article.slug} />)}</div>}</EditorialSection>
    <EditorialSection eyebrow="Explore by concern" title="Follow the route that matches your question."><div className="knowledge-concern-rail">{knowledgeHubConcerns.map((concern) => <Link href={concern.href} key={concern.href}><span>{concern.label}</span><small>{concern.description}</small><span aria-hidden="true">↗</span></Link>)}</div></EditorialSection>
    <EditorialSection eyebrow="Topic clusters" title="Build context around the question." ><div className="knowledge-cluster-list">{[...editorialClusters].sort((a, b) => a.sortOrder - b.sortOrder).map((cluster) => <ClusterRail cluster={cluster} key={cluster.id} />)}</div></EditorialSection>
    <EditorialSection eyebrow="Explore by category" title="Move from a question to a useful body of guidance."><div className="knowledge-category-rail">{Object.values(knowledgeCategories).map((category) => <Link href={`/knowledge-hub/category/${category.slug}`} key={category.slug}><span>{category.label}</span><small>{category.description}</small><span aria-hidden="true">↗</span></Link>)}</div></EditorialSection>
    <EditorialSection eyebrow="Core pathways" title="Some answers belong outside an article."><RelatedResources links={[{ label: "Deposit protection guide", href: "/guides/deposit-protection", description: "The flagship overview of records and protection questions." }, { label: "Frequently asked questions", href: "/faqs", description: "Concise answers for common starting points." }, { label: "How it works", href: "/how-it-works", description: "The client journey from assessment to claim." }]} /></EditorialSection>
    <PublicCta title="Use the guidance, then decide your next step" description="A preliminary eligibility assessment can help organise your own circumstances without creating a claim automatically." />
  </article>;
}
