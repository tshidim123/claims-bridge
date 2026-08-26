import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

const footerGroups = [
  {
    title: "Claims",
    links: [
      ["Deposit not protected", "/claims/deposit-not-protected"],
      ["Protected late", "/claims/deposit-protected-late"],
      ["Missing information", "/claims/missing-prescribed-information"],
      ["Cannot find scheme", "/claims/cannot-find-scheme"],
    ],
  },
  {
    title: "Navigate",
    links: [
      ["How it works", "/how-it-works"],
      ["Resources", "/resources"],
      ["About", "/about"],
      ["Support", "/support"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Legal information", "/legal"],
      ["Privacy", "/legal/privacy"],
      ["Terms", "/legal/terms"],
      ["Cookies", "/legal/cookies"],
      ["Complaints", "/legal/complaints"],
      ["Accessibility", "/legal/accessibility"],
    ],
  },
] as const;

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="application-container public-footer__inner">
        <div className="public-footer__brand">
          <BrandMark />
          <p>
            Clear, evidence-led support for private renters navigating tenancy deposit protection issues.
          </p>
          <p className="public-footer__regulatory-note">
            Legal and regulatory information will be published here before the service becomes operational.
          </p>
        </div>
        <div className="public-footer__navigation">
          {footerGroups.map((group) => (
            <section key={group.title} aria-labelledby={`footer-${group.title.toLowerCase()}`}>
              <h2 id={`footer-${group.title.toLowerCase()}`}>{group.title}</h2>
              <ul>
                {group.links.map(([label, href]) => (
                  <li key={href}><Link href={href}>{label}</Link></li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <div className="application-container public-footer__base">
        <span>© {new Date().getFullYear()} Claims Bridge</span>
        <span>Claims Bridge platform</span>
      </div>
    </footer>
  );
}
