export type NavigationItem = {
  label: string;
  href: string;
  description?: string;
};

export type PublicNavigationItem = NavigationItem & {
  id: string;
};

export type NavigationSection = {
  label: string;
  href: string;
  supportingText: string;
  items?: PublicNavigationItem[];
  featured?: NavigationItem;
};

export const publicNavigation: NavigationSection[] = [
  { label: "Home", href: "/", supportingText: "Claims Bridge home" },
  {
    label: "Deposit claims",
    href: "/deposit-claims",
    supportingText: "Understand common tenancy-deposit protection concerns.",
    featured: {
      label: "Explore deposit protection issues",
      href: "/deposit-claims",
      description: "A clear starting point for understanding what may have gone wrong.",
    },
    items: [
      {
        id: "deposit-not-protected",
        label: "Deposit not protected",
        href: "/deposit-claims/not-protected",
        description: "When a landlord or agent may not have protected the deposit.",
      },
      {
        id: "deposit-protected-late",
        label: "Deposit protected late",
        href: "/deposit-claims/late-protection",
        description: "Understand the timing issue and the evidence that may matter.",
      },
      {
        id: "missing-prescribed-information",
        label: "Missing prescribed information",
        href: "/deposit-claims/missing-information",
        description: "What prescribed information is and why it matters.",
      },
      {
        id: "cannot-find-my-deposit",
        label: "Cannot find my deposit",
        href: "/deposit-claims/cant-find-my-deposit",
        description: "Practical checks when your protection record is unclear.",
      },
    ],
  },
  {
    label: "How It Works",
    href: "/how-it-works",
    supportingText: "See the path from eligibility to resolution.",
    featured: {
      label: "A process designed for clarity",
      href: "/how-it-works",
      description: "Understand the stages, information requests and points where action may be needed.",
    },
    items: [
      { id: "eligibility", label: "Eligibility", href: "/check-eligibility", description: "Start with a guided initial check." },
      { id: "claim-process", label: "Claim process", href: "/claim-process", description: "What changes after you choose to proceed." },
      { id: "evidence-guide", label: "Evidence guide", href: "/guides/deposit-protection", description: "Prepare the records that may support an assessment." },
      { id: "track-your-claim", label: "Track your claim", href: "/track-your-claim", description: "How secure progress tracking works." },
    ],
  },
  {
    label: "Learn",
    href: "/knowledge-hub",
    supportingText: "Evidence-led guidance without the legal fog.",
    featured: {
      label: "Browse the Knowledge Hub",
      href: "/knowledge-hub",
      description: "Guides and explainers organised around real tenant questions.",
    },
    items: [
      { id: "knowledge-hub", label: "Knowledge Hub", href: "/knowledge-hub", description: "Practical tenancy deposit guidance." },
      { id: "faqs", label: "FAQs", href: "/faqs", description: "Direct answers to common questions." },
      { id: "deposit-protection-guide", label: "Deposit protection guide", href: "/guides/deposit-protection", description: "Issue-led protection information." },
      { id: "evidence-checklist", label: "Evidence checklist", href: "/guides/deposit-protection", description: "Records that may be useful." },
      { id: "glossary", label: "Glossary", href: "/resources/glossary", description: "Plain-language terminology." },
    ],
  },
  {
    label: "About",
    href: "/about",
    supportingText: "Why the service is being built and how it should operate.",
    featured: {
      label: "Meet the Claims Bridge approach",
      href: "/about",
      description: "Evidence-led assessment, transparent progress and clearer communication.",
    },
    items: [
      { id: "about-claims-bridge", label: "About Claims Bridge", href: "/about", description: "The product and its purpose." },
      { id: "our-approach", label: "Our approach", href: "/about/our-approach", description: "How clarity is built into the process." },
      { id: "about-why", label: "Why Claims Bridge", href: "/about#why", description: "The problem the platform is designed to address." },
      { id: "trust-transparency", label: "Trust & transparency", href: "/about#transparency", description: "Principles for honest client visibility." },
      { id: "why-claims-bridge", label: "Why Claims Bridge", href: "/why-claims-bridge", description: "The product choices behind a clearer client route." },
      { id: "security-privacy", label: "Security and privacy", href: "/security", description: "How authenticated account boundaries are approached." },
      { id: "contact", label: "Contact", href: "/contact", description: "How to get in touch." },
    ],
  },
  { label: "Support", href: "/support", supportingText: "Help and contact options" },
];

export const accountNavigation: NavigationItem[] = [
  { label: "Overview", href: "/account" },
  { label: "My claims", href: "/account/claims" },
  { label: "Documents", href: "/account/documents" },
  { label: "Messages", href: "/account/messages" },
  { label: "Notifications", href: "/account/notifications" },
  { label: "Resources", href: "/resources" },
  { label: "Support", href: "/support" },
  { label: "Account", href: "/account/profile" },
];

export function claimNavigation(claimId: string): NavigationItem[] {
  const root = `/account/claims/${encodeURIComponent(claimId)}`;

  return [
    { label: "Overview", href: root },
    { label: "Timeline", href: `${root}/timeline` },
    { label: "Evidence", href: `${root}/evidence` },
    { label: "Documents", href: `${root}/documents` },
    { label: "Messages", href: `${root}/messages` },
    { label: "Updates", href: `${root}/updates` },
    { label: "Claim details", href: `${root}/details` },
  ];
}
