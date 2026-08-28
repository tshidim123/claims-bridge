import { legalCopy, publicCtas } from "@/config/public-site";
import { PublicBreadcrumbs, PublicCta, PublicHero, EditorialSection, IssueSignals, RelatedResources, ScopeNotice } from "@/components/public/public-editorial";

export type IssuePageContent = {
  eyebrow: string;
  title: string;
  intro: string;
  signals: readonly string[];
  sections: readonly (readonly [string, string])[];
};

export function IssuePage({ content, breadcrumbLabel }: { content: IssuePageContent; breadcrumbLabel: string }) {
  const articleLinks: Record<string, { label: string; href: string; description: string }> = {
    "Not protected": { label: "Missing protection information", href: "/knowledge-hub/when-you-cannot-find-deposit-protection-information", description: "What to look for when the protection record is unclear." },
    "Late protection": { label: "Organise the paperwork", href: "/knowledge-hub/organise-tenancy-deposit-paperwork", description: "Bring dates and records into one clearer starting point." },
    "Missing information": { label: "Information that may help", href: "/knowledge-hub/information-that-may-help-a-deposit-protection-review", description: "A focused guide to useful record groups." },
    "Cannot find my deposit": { label: "Questions about the scheme", href: "/knowledge-hub/questions-when-you-are-unsure-of-the-scheme", description: "Practical questions to ask when the scheme is unclear." },
  };
  const articleLink = articleLinks[breadcrumbLabel] ?? articleLinks["Not protected"];
  return <article className="public-page public-issue-page">
    <PublicHero eyebrow={content.eyebrow} title={content.title} description={content.intro} actions={[publicCtas.checkEligibility, { label: "Read the guide", href: "/guides/deposit-protection", variant: "secondary" }]} />
    <PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Deposit claims", href: "/deposit-claims" }, { label: breadcrumbLabel }]} />
    <EditorialSection eyebrow="Signals to check" title="Start with the facts you can verify.">
      <div className="public-two-column"><IssueSignals signals={content.signals} /><ScopeNotice>{legalCopy.preliminary} {legalCopy.evidence}</ScopeNotice></div>
    </EditorialSection>
    <EditorialSection eyebrow="A clearer route" title="What may help next." className="public-editorial-section--lined">
      <div className="public-story-grid">{content.sections.map(([title, text], index) => <section key={title}><span className="public-story-grid__index">{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{text}</p></section>)}</div>
    </EditorialSection>
    <EditorialSection eyebrow="Keep the position balanced" title="A possible issue needs a proper assessment.">
      <p className="public-reading-copy">{legalCopy.scope} Claims Bridge can help organise a preliminary picture and, where appropriate, support the next stages. It does not establish liability or guarantee an outcome.</p>
      <RelatedResources links={[articleLink, { label: "How it works", href: "/how-it-works", description: "See the journey from initial check to client account." }, { label: "Evidence guide", href: "/guides/deposit-protection", description: "Understand which records may help clarify the position." }]} />
    </EditorialSection>
    <PublicCta />
  </article>;
}
