import Link from "next/link";

import { BrandMark } from "@/components/brand/brand-mark";

const footerGroups = [
  {
    title: "Claims",
    links: [
      ["Deposit claims", "/deposit-claims"],
      ["Deposit not protected", "/deposit-claims/not-protected"],
      ["Protected late", "/deposit-claims/late-protection"],
      ["Missing information", "/deposit-claims/missing-information"],
      ["Check eligibility", "/check-eligibility"],
    ],
  },
  {
    title: "Process",
    links: [
      ["How it works", "/how-it-works"],
      ["Claim process", "/claim-process"],
      ["Client portal", "/client-portal"],
      ["Track your claim", "/track-your-claim"],
      ["Support", "/support"],
    ],
  },
  {
    title: "Learn",
    links: [
      ["Deposit protection guide", "/guides/deposit-protection"],
      ["FAQs", "/faqs"],
      ["Knowledge Hub", "/knowledge-hub"],
      ["About", "/about"],
      ["Contact", "/contact"],
      ["Why Claims Bridge", "/why-claims-bridge"],
      ["Security", "/security"],
    ],
  },
  {
    title: "Account",
    links: [
      ["Sign in", "/sign-in"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
      ["Cookies", "/cookies"],
      ["Service transparency", "/service-transparency"],
      ["Complaints", "/complaints"],
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
