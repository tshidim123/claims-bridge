import { EditorialSection, PublicBreadcrumbs, PublicHero, ScopeNotice } from "@/components/public/public-editorial";

export type LegalSection = { title: string; body: string };

export function LegalPage({ title, description, eyebrow, sections, note }: { title: string; description: string; eyebrow: string; sections: readonly LegalSection[]; note: string }) {
  return <article className="public-page public-legal-page"><PublicHero eyebrow={eyebrow} title={title} description={description} /><PublicBreadcrumbs items={[{ label: "Home", href: "/" }, { label: "Legal", href: "/legal" }, { label: title }]} /><EditorialSection eyebrow="Readable by design" title="The information that applies to this public site and account experience."><div className="public-legal-sections">{sections.map((section, index) => <section key={section.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{section.title}</h3><p>{section.body}</p></div></section>)}</div></EditorialSection><EditorialSection eyebrow="Important context" title="Some details depend on the operational service configuration."><ScopeNotice>{note}</ScopeNotice></EditorialSection></article>;
}
