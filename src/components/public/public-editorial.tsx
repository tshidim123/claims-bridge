import Link from "next/link";
import type { ReactNode } from "react";

import { ApplicationContainer } from "@/components/layout/application-container";
import { Icon } from "@/components/ui/icon";
import { publicCtas, type PublicBreadcrumb } from "@/config/public-site";
import { cn } from "@/lib/utils";

type Action = { label: string; href: string; variant?: "primary" | "secondary" };

export function PublicBreadcrumbs({ items }: { items: PublicBreadcrumb[] }) {
  return <nav className="public-breadcrumbs" aria-label="Breadcrumb"><ol>{items.map((item, index) => <li key={`${item.label}-${index}`}>{item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}{index < items.length - 1 && <span aria-hidden="true">/</span>}</li>)}</ol></nav>;
}

export function PublicHero({ eyebrow, title, description, actions = [], children, className }: { eyebrow: string; title: string; description: string; actions?: Action[]; children?: ReactNode; className?: string }) {
  return <section className={cn("public-editorial-hero", className)}><ApplicationContainer><div className="public-editorial-hero__grid"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="public-editorial-hero__description">{description}</p><div className="public-editorial-hero__actions">{actions.map((action) => <Link className={`button button--medium button--${action.variant ?? "primary"}`} href={action.href} key={action.href}><span className="button__label">{action.label}</span><Icon name="arrow" /></Link>)}</div></div>{children ?? <div className="public-editorial-hero__marker" aria-hidden="true"><span>CB</span><i /><i /><i /></div>}</div></ApplicationContainer></section>;
}

export function EditorialSection({ eyebrow, title, children, className }: { eyebrow?: string; title: string; children: ReactNode; className?: string }) {
  return <section className={cn("public-editorial-section", className)}><ApplicationContainer><div className="public-editorial-section__heading">{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{children}</ApplicationContainer></section>;
}

export function ProcessRail({ steps, className }: { steps: readonly (readonly [string, string, string])[]; className?: string }) {
  return <ol className={cn("public-process-rail", className)}>{steps.map(([index, title, description]) => <li key={index}><span className="public-process-rail__index">{index}</span><div><h3>{title}</h3><p>{description}</p></div></li>)}</ol>;
}

export function IssueSignals({ signals }: { signals: readonly string[] }) {
  return <ul className="public-signal-list">{signals.map((signal) => <li key={signal}><span aria-hidden="true" /><span>{signal}</span></li>)}</ul>;
}

export function ScopeNotice({ title = "A careful starting point", children }: { title?: string; children?: ReactNode }) {
  return <aside className="public-scope-notice"><p className="eyebrow">Scope / clarity</p><h2>{title}</h2><p>{children ?? "Claims Bridge can help organise a potential tenancy-deposit protection issue, but a preliminary assessment is not a legal conclusion or guarantee."}</p></aside>;
}

export function PublicCta({ title = "Start with what you know", description = "A short preliminary assessment can help you understand which details may need a closer look.", actions = [publicCtas.checkEligibility, publicCtas.howItWorks] }: { title?: string; description?: string; actions?: Action[] }) {
  return <section className="public-cta"><ApplicationContainer><div className="public-cta__inner"><div><p className="eyebrow">Next route</p><h2>{title}</h2><p>{description}</p></div><div className="public-cta__actions">{actions.map((action) => <Link className={`button button--medium button--${action.variant ?? "primary"}`} href={action.href} key={action.href}><span className="button__label">{action.label}</span><Icon name="arrow" /></Link>)}</div></div></ApplicationContainer></section>;
}

export function RelatedResources({ links }: { links: readonly { label: string; href: string; description: string }[] }) {
  return <div className="public-related-grid">{links.map((link, index) => <Link className="public-related-link" href={link.href} key={link.href}><span className="public-related-link__index">{String(index + 1).padStart(2, "0")}</span><span><strong>{link.label}</strong><small>{link.description}</small></span><Icon name="arrow" /></Link>)}</div>;
}

export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
