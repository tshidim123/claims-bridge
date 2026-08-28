export type EditorialCluster = {
  id: string;
  title: string;
  description: string;
  category: string;
  pillar: { label: string; href: string };
  topics: readonly string[];
  featuredArticles: readonly string[];
  relatedServiceRoutes: readonly { label: string; href: string }[];
  sortOrder: number;
};

export const editorialClusters: readonly EditorialCluster[] = [
  {
    id: "deposit-protection",
    title: "Deposit protection",
    description: "Build a clearer record of the deposit, protection information and correspondence connected to a tenancy.",
    category: "deposit-protection",
    pillar: { label: "Deposit protection guide", href: "/guides/deposit-protection" },
    topics: ["Deposit protection", "Deposit schemes", "Missing information"],
    featuredArticles: ["when-you-cannot-find-deposit-protection-information", "questions-when-you-are-unsure-of-the-scheme"],
    relatedServiceRoutes: [{ label: "Deposit claims", href: "/deposit-claims" }, { label: "Cannot find my deposit", href: "/deposit-claims/cant-find-my-deposit" }],
    sortOrder: 1,
  },
  {
    id: "eligibility-review",
    title: "Eligibility and preliminary review",
    description: "Understand what a preliminary eligibility assessment can organise before you decide whether to proceed.",
    category: "eligibility",
    pillar: { label: "Eligibility assessment", href: "/check-eligibility" },
    topics: ["Eligibility", "Preliminary result", "Assessment"],
    featuredArticles: ["eligibility-check-and-claims-bridge-claim", "what-a-preliminary-eligibility-result-means"],
    relatedServiceRoutes: [{ label: "Check eligibility", href: "/check-eligibility" }, { label: "How it works", href: "/how-it-works" }],
    sortOrder: 2,
  },
  {
    id: "claims-bridge-process",
    title: "The Claims Bridge process",
    description: "Follow the client-facing journey from an explicit decision to proceed through staged claim progress.",
    category: "claim-process",
    pillar: { label: "Claim process", href: "/claim-process" },
    topics: ["Claim process", "Claim stages", "Next steps"],
    featuredArticles: ["what-happens-after-you-start-a-claims-bridge-claim", "understanding-claims-bridge-stages"],
    relatedServiceRoutes: [{ label: "Claim process", href: "/claim-process" }, { label: "Track your claim", href: "/track-your-claim" }],
    sortOrder: 3,
  },
  {
    id: "evidence-documentation",
    title: "Evidence and documentation",
    description: "Practical ways to organise supporting information while keeping evidence requests separate from outcomes.",
    category: "evidence",
    pillar: { label: "Information for a review", href: "/knowledge-hub/information-that-may-help-a-deposit-protection-review" },
    topics: ["Evidence", "Requirements", "Records", "Document Vault"],
    featuredArticles: ["information-that-may-help-a-deposit-protection-review", "preparing-digital-evidence-for-review"],
    relatedServiceRoutes: [{ label: "Evidence workspace", href: "/deposit-claims" }, { label: "Deposit protection guide", href: "/guides/deposit-protection" }],
    sortOrder: 4,
  },
  {
    id: "renter-record-keeping",
    title: "Renter record-keeping",
    description: "Keep tenancy, payment and correspondence records together so the next question is easier to identify.",
    category: "renter-guides",
    pillar: { label: "Organise your paperwork", href: "/knowledge-hub/organise-tenancy-deposit-paperwork" },
    topics: ["Renter guide", "Records", "Paperwork", "Evidence"],
    featuredArticles: ["organise-tenancy-deposit-paperwork", "tenancy-deposit-document-checklist"],
    relatedServiceRoutes: [{ label: "Deposit protection guide", href: "/guides/deposit-protection" }, { label: "Support", href: "/support" }],
    sortOrder: 5,
  },
  {
    id: "client-portal-support",
    title: "Client portal and support",
    description: "Learn how authenticated claim tracking, secure messages and account updates keep the process visible.",
    category: "client-support",
    pillar: { label: "Client portal", href: "/client-portal" },
    topics: ["Client portal", "Messages", "Notifications", "Claim tracking"],
    featuredArticles: ["how-the-claims-bridge-client-portal-helps-track-a-claim", "how-secure-claims-bridge-messages-relate-to-your-claim"],
    relatedServiceRoutes: [{ label: "Client portal", href: "/client-portal" }, { label: "Support", href: "/support" }],
    sortOrder: 6,
  },
] as const;

export const knowledgeHubConcerns = [
  { label: "I cannot find my deposit information", href: "/deposit-claims/cant-find-my-deposit", description: "Start with practical checks and the records you may already have." },
  { label: "I am unsure whether my deposit was protected", href: "/deposit-claims", description: "Understand the protection questions a preliminary assessment can help organise." },
  { label: "I am organising evidence", href: "/knowledge-hub/category/evidence", description: "Find guidance for keeping supporting records clear and together." },
  { label: "I have completed eligibility", href: "/knowledge-hub/eligibility-check-and-claims-bridge-claim", description: "Understand the difference between a result and an explicit decision to proceed." },
  { label: "I have started a claim", href: "/claim-process", description: "See the broad stages and client-visible route." },
  { label: "I need help using my account", href: "/client-portal", description: "Learn what the authenticated client workspace is designed to show." },
] as const;
