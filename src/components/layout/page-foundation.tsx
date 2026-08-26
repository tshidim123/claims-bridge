import Link from "next/link";

import { ApplicationContainer } from "@/components/layout/application-container";
import { Icon } from "@/components/ui/icon";

type FoundationLink = {
  href: string;
  label: string;
};

type PageFoundationProps = {
  description: string;
  eyebrow: string;
  links?: FoundationLink[];
  plannedSections?: string[];
  title: string;
};

export function PageFoundation({
  description,
  eyebrow,
  links = [],
  plannedSections = [],
  title,
}: PageFoundationProps) {
  return (
    <article className="page-foundation">
      <ApplicationContainer>
        <div className="page-foundation__heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          <div className="page-foundation__summary">
            <p>{description}</p>
            <span className="foundation-label">
              <span aria-hidden="true" /> Phase 1A route foundation
            </span>
          </div>
        </div>

        <div className="page-foundation__body">
          <div className="page-foundation__line" aria-hidden="true">
            <span />
          </div>
          <section aria-labelledby="planned-content-title">
            <p className="eyebrow">Structure prepared</p>
            <h2 id="planned-content-title">Built to grow without changing the foundation.</h2>
            <p>
              Content and workflow logic will be introduced in a later phase. This page already inherits the public shell, metadata, typography, responsive container and accessibility foundations.
            </p>
          </section>

          {plannedSections.length > 0 && (
            <section className="planned-sections" aria-labelledby="planned-sections-title">
              <h2 id="planned-sections-title">Planned sections</h2>
              <ol>
                {plannedSections.map((section, index) => (
                  <li key={section}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {section}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {links.length > 0 && (
            <nav className="page-foundation__links" aria-label="Related pages">
              {links.map((link) => (
                <Link href={link.href} key={link.href}>
                  <span>{link.label}</span>
                  <Icon name="arrow" />
                </Link>
              ))}
            </nav>
          )}
        </div>
      </ApplicationContainer>
    </article>
  );
}
