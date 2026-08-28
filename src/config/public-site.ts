import type { Metadata } from "next";

export const publicCtas = {
  checkEligibility: { label: "Check eligibility", href: "/check-eligibility" },
  howItWorks: { label: "How it works", href: "/how-it-works" },
  depositClaims: { label: "Explore deposit claims", href: "/deposit-claims" },
  signIn: { label: "Sign in", href: "/sign-in" },
  support: { label: "View support", href: "/support" },
} as const;

export const publicRoutePaths = [
  "/",
  "/about",
  "/how-it-works",
  "/claim-process",
  "/deposit-claims",
  "/deposit-claims/not-protected",
  "/deposit-claims/late-protection",
  "/deposit-claims/missing-information",
  "/deposit-claims/cant-find-my-deposit",
  "/guides/deposit-protection",
  "/check-eligibility",
  "/client-portal",
  "/track-your-claim",
  "/support",
  "/contact",
  "/faqs",
  "/why-claims-bridge",
  "/security",
  "/service-transparency",
  "/privacy",
  "/terms",
  "/cookies",
  "/complaints",
  "/knowledge-hub",
] as const;

export const publicScope = {
  helpsWith: [
    "A deposit that may not have been protected",
    "Protection that may have happened late",
    "Deposit-protection information that is missing or unclear",
    "Uncertainty about which protection scheme was used",
  ],
  notPrimaryFor: [
    "Ordinary deposit deduction disagreements",
    "Fair wear and tear disputes",
    "Repairs, rent arrears or eviction disputes generally",
    "Housing-benefit matters or general landlord complaints",
  ],
} as const;

export const legalCopy = {
  preliminary:
    "An eligibility result is preliminary. It does not guarantee that a claim exists, will succeed or will result in compensation.",
  evidence:
    "The information and records available will affect what can be assessed. Missing a document does not, by itself, determine the outcome.",
  scope:
    "Claims Bridge focuses on potential tenancy-deposit protection issues. Other housing or deposit disputes may need a different route.",
} as const;

export const publicMetadata = {
  about: ["About Claims Bridge", "A transparent, evidence-led approach to helping renters understand potential tenancy-deposit protection issues."],
  howItWorks: ["How Claims Bridge works", "See the clear, evidence-led journey from preliminary eligibility to claim progress and resolution."],
  claimProcess: ["The Claims Bridge claim process", "Understand what happens after a renter decides to proceed with a Claims Bridge claim."],
  depositClaims: ["Tenancy deposit protection claims", "Understand common deposit-protection concerns and how Claims Bridge may help with the next assessment."],
  notProtected: ["Deposit may not be protected", "Learn what to check when you cannot confirm that a tenancy deposit was protected."],
  lateProtection: ["Deposit protection may have happened late", "Understand why protection timing may warrant closer review and which records may help."],
  missingInformation: ["Missing deposit-protection information", "Learn what deposit and scheme information renters may look for when records are incomplete."],
  cantFindDeposit: ["I cannot find my deposit scheme", "Practical checks for renters who paid a deposit but cannot identify its protection scheme."],
  guide: ["Deposit protection guide", "A plain-language guide to tenancy deposit protection, records and useful next steps."],
  clientPortal: ["Claims Bridge client portal", "See how authenticated clients can follow claim stages, evidence, messages and next steps."],
  track: ["Track your Claims Bridge claim", "Learn how secure claim tracking keeps stages, activity, evidence and correspondence visible."],
  support: ["Claims Bridge support", "Find guidance for eligibility, existing claims, accounts, evidence and secure correspondence."],
  contact: ["Contact Claims Bridge", "Find truthful support routes and understand how to ask for help before the operational service launches."],
  faqs: ["Claims Bridge FAQs", "Clear answers about eligibility, deposit protection, the claim process, evidence, accounts and support."],
} as const;

export function createPublicMetadata(
  title: string,
  description: string,
  canonicalPath: `/${string}`,
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { title, description, type: "website", url: canonicalPath, siteName: "Claims Bridge" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export type PublicBreadcrumb = { label: string; href?: string };

export function makeBreadcrumbs(items: PublicBreadcrumb[]) {
  return items;
}
