export type NavigationItem = {
  label: string;
  href: string;
  description?: string;
};

export type NavigationSection = {
  label: string;
  href: string;
  supportingText: string;
  items?: NavigationItem[];
  featured?: NavigationItem;
};

export const publicNavigation: NavigationSection[] = [
  { label: "Home", href: "/", supportingText: "Claims Bridge home" },
  {
    label: "Claims",
    href: "/claims",
    supportingText: "Understand common tenancy deposit protection issues.",
    featured: {
      label: "Explore deposit protection issues",
      href: "/claims",
      description: "A clear starting point for understanding what may have gone wrong.",
    },
    items: [
      {
        label: "Deposit not protected",
        href: "/claims/deposit-not-protected",
        description: "When a landlord or agent may not have protected the deposit.",
      },
      {
        label: "Deposit protected late",
        href: "/claims/deposit-protected-late",
        description: "Understand the timing issue and the evidence that may matter.",
      },
      {
        label: "Missing prescribed information",
        href: "/claims/missing-prescribed-information",
        description: "What prescribed information is and why it matters.",
      },
      {
        label: "Cannot find my scheme",
        href: "/claims/cannot-find-scheme",
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
      { label: "Eligibility", href: "/check-eligibility", description: "Start with a guided initial check." },
      { label: "Claim process", href: "/how-it-works#claim-process", description: "A stage-by-stage view of the proposed journey." },
      { label: "Evidence", href: "/resources/evidence-guide", description: "Prepare the records that may support an assessment." },
      { label: "Claim status", href: "/how-it-works#claim-status", description: "What future portal stages will mean." },
    ],
  },
  {
    label: "Resources",
    href: "/resources",
    supportingText: "Evidence-led guidance without the legal fog.",
    featured: {
      label: "Browse the Knowledge Hub",
      href: "/resources",
      description: "Guides and explainers organised around real tenant questions.",
    },
    items: [
      { label: "Guides", href: "/resources", description: "Practical tenancy deposit guidance." },
      { label: "FAQs", href: "/resources/faqs", description: "Direct answers to common questions." },
      { label: "Blog", href: "/blog", description: "Long-form explainers and future updates." },
      { label: "Deposit protection", href: "/claims", description: "Issue-led protection information." },
      { label: "Evidence checklist", href: "/resources/evidence-guide", description: "Documents that may be useful." },
      { label: "Glossary", href: "/resources/glossary", description: "Plain-language terminology." },
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
      { label: "About Claims Bridge", href: "/about", description: "The product and its purpose." },
      { label: "Our approach", href: "/about/our-approach", description: "How clarity is built into the process." },
      { label: "Why Claims Bridge", href: "/about#why", description: "The problem the platform is designed to address." },
      { label: "Trust & transparency", href: "/about#transparency", description: "Principles for honest client visibility." },
      { label: "Contact", href: "/contact", description: "How to get in touch." },
    ],
  },
  { label: "Blog", href: "/blog", supportingText: "Knowledge Hub" },
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
    { label: "Updates", href: `${root}#updates` },
    { label: "Claim details", href: `${root}#claim-details` },
  ];
}
