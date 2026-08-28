export type RouteFoundationContent = {
  description: string;
  eyebrow: string;
  links?: Array<{ href: string; label: string }>;
  plannedSections?: string[];
  title: string;
};

export const routeFoundations = {
  eligibility: {
    eyebrow: "Initial assessment",
    title: "Check eligibility",
    description: "A future guided assessment will help renters identify whether their tenancy and deposit circumstances may require closer review.",
    plannedSections: ["Tenancy details", "Deposit timing", "Protection information", "Prescribed information", "Evidence summary", "Clear next steps"],
    links: [{ label: "How claims work", href: "/how-it-works" }, { label: "Evidence guide", href: "/guides/deposit-protection" }],
  },
  howItWorks: {
    eyebrow: "Process visibility",
    title: "How claims work",
    description: "A transparent path from an initial eligibility check through evidence collection, review, preparation and resolution.",
    plannedSections: ["Eligibility", "Initial review", "Evidence collection", "Assessment", "Claim preparation", "Progress and resolution"],
    links: [{ label: "Check eligibility", href: "/check-eligibility" }, { label: "Evidence guide", href: "/guides/deposit-protection" }],
  },
  claims: {
    eyebrow: "Deposit protection issues",
    title: "Understand what may have gone wrong.",
    description: "Issue-led guidance will explain common tenancy deposit protection problems and the information that may help clarify them.",
    plannedSections: ["Deposit not protected", "Deposit protected late", "Missing prescribed information", "Cannot find a protection scheme"],
    links: [{ label: "Deposit not protected", href: "/claims/deposit-not-protected" }, { label: "Deposit protected late", href: "/claims/deposit-protected-late" }, { label: "Missing prescribed information", href: "/claims/missing-prescribed-information" }, { label: "Cannot find my scheme", href: "/claims/cannot-find-scheme" }],
  },
  depositNotProtected: {
    eyebrow: "Deposit protection issue",
    title: "Deposit not protected",
    description: "A focused foundation for explaining possible non-protection, relevant dates, scheme searches and the records a renter may hold.",
    plannedSections: ["What protection means", "Key dates", "What to check", "Evidence to preserve", "Potential next steps"],
    links: [{ label: "Check eligibility", href: "/check-eligibility" }, { label: "Evidence guide", href: "/guides/deposit-protection" }],
  },
  depositProtectedLate: {
    eyebrow: "Deposit protection issue",
    title: "Deposit protected late",
    description: "A focused foundation for explaining protection timing and how tenancy, payment and scheme dates may fit together.",
    plannedSections: ["Protection timing", "Dates that may matter", "Scheme records", "Evidence to preserve", "Potential next steps"],
    links: [{ label: "Check eligibility", href: "/check-eligibility" }, { label: "Deposit issues", href: "/claims" }],
  },
  prescribedInformation: {
    eyebrow: "Deposit protection issue",
    title: "Missing prescribed information",
    description: "A focused foundation for explaining prescribed information, what renters may have received and where evidence can be found.",
    plannedSections: ["What prescribed information is", "What may have been provided", "Signatures and delivery", "Evidence to preserve", "Potential next steps"],
    links: [{ label: "Check eligibility", href: "/check-eligibility" }, { label: "Glossary", href: "/resources/glossary" }],
  },
  cannotFindScheme: {
    eyebrow: "Deposit protection issue",
    title: "Cannot find my deposit scheme",
    description: "A practical route foundation for scheme searches, name and address variations, and gathering the right correspondence.",
    plannedSections: ["Search all schemes", "Check tenancy details", "Review correspondence", "Record search outcomes", "Potential next steps"],
    links: [{ label: "Check eligibility", href: "/check-eligibility" }, { label: "Evidence guide", href: "/guides/deposit-protection" }],
  },
  resources: {
    eyebrow: "Knowledge Hub",
    title: "Clear guidance, organised around the evidence.",
    description: "The resource architecture is prepared for serious, reviewed guidance without invented authors, citations or publication claims.",
    plannedSections: ["Deposit protection", "Prescribed information", "Tenant guides", "Claim process", "Evidence", "FAQs", "Updates"],
    links: [{ label: "Evidence guide", href: "/guides/deposit-protection" }, { label: "FAQs", href: "/faqs" }, { label: "Glossary", href: "/resources/glossary" }, { label: "Blog", href: "/blog" }],
  },
  evidenceGuide: {
    eyebrow: "Resource foundation",
    title: "Evidence guide",
    description: "A future evidence-led guide to tenancy records, deposit payments, certificates, prescribed information and correspondence.",
    plannedSections: ["Tenancy agreement", "Payment evidence", "Protection records", "Prescribed information", "Correspondence", "Supporting records"],
    links: [{ label: "Document categories", href: "/account/documents" }, { label: "Check eligibility", href: "/check-eligibility" }],
  },
  faqs: {
    eyebrow: "Resource foundation",
    title: "Frequently asked questions",
    description: "A searchable, accessible answer system will be introduced here once legal content has been reviewed and approved.",
    plannedSections: ["Eligibility", "Deposit protection", "Evidence", "The claim process", "Account and documents", "Support"],
    links: [{ label: "Browse resources", href: "/resources" }, { label: "Contact support", href: "/support" }],
  },
  glossary: {
    eyebrow: "Resource foundation",
    title: "Plain-language glossary",
    description: "Legal and process terms will be indexed here with concise, reviewed explanations and contextual links.",
    plannedSections: ["Deposit protection terms", "Tenancy terms", "Evidence terms", "Process terms", "Court and resolution terms"],
    links: [{ label: "Browse resources", href: "/resources" }, { label: "How claims work", href: "/how-it-works" }],
  },
  blog: {
    eyebrow: "Knowledge Hub",
    title: "Guidance that connects the detail.",
    description: "The publishing foundation supports categories, authors, reviewers, published and updated dates, reading time, citations and related guidance—without fabricating any of them now.",
    plannedSections: ["Deposit Protection", "Prescribed Information", "Tenant Guides", "Claim Process", "Evidence", "FAQs", "Updates"],
    links: [{ label: "Browse resources", href: "/resources" }, { label: "Check eligibility", href: "/check-eligibility" }],
  },
  about: {
    eyebrow: "About Claims Bridge",
    title: "Legal support should not feel opaque.",
    description: "Claims Bridge is being designed around evidence-led assessment, client visibility and clear communication. Company and team information will be added only when verified.",
    plannedSections: ["What Claims Bridge is", "Why it exists", "Mission", "Service philosophy", "What we help with", "What we do not handle", "How the process works", "Transparency principles", "Technology and visibility", "Evidence-led assessment", "Data and privacy", "Client communication", "Company and team", "FAQs", "Contact"],
    links: [{ label: "Our approach", href: "/about/our-approach" }, { label: "Contact", href: "/contact" }],
  },
  approach: {
    eyebrow: "Our approach",
    title: "Clarity should be designed into the process.",
    description: "A foundation for explaining how evidence, communication, data care and honest progress reporting will shape the service.",
    plannedSections: ["Evidence first", "Clear responsibility", "Visible progress", "Proportionate communication", "Privacy by design", "Honest outcomes"],
    links: [{ label: "About Claims Bridge", href: "/about" }, { label: "How claims work", href: "/how-it-works" }],
  },
  contact: {
    eyebrow: "Get in touch",
    title: "Contact Claims Bridge",
    description: "Contact routes and response expectations will be published here before launch. No unmonitored contact details are shown in this foundation.",
    plannedSections: ["General enquiries", "Existing client support", "Accessibility help", "Complaints", "Response expectations"],
    links: [{ label: "Support", href: "/support" }, { label: "Complaints", href: "/legal/complaints" }],
  },
  support: {
    eyebrow: "Support",
    title: "Help should be easy to find.",
    description: "A support foundation for account help, claim questions, documents, accessibility and future service-status communication.",
    plannedSections: ["Account access", "Claim questions", "Documents and uploads", "Messages and notifications", "Accessibility support", "Contact options"],
    links: [{ label: "Frequently asked questions", href: "/faqs" }, { label: "Contact", href: "/contact" }],
  },
  privacy: {
    eyebrow: "Legal information",
    title: "Privacy",
    description: "The production privacy notice will describe data roles, purposes, retention, sharing, security, rights and contact routes before data collection begins.",
    plannedSections: ["Who controls data", "Data collected", "Purposes and lawful bases", "Sharing", "Retention", "Security", "Rights", "Contact"],
    links: [{ label: "Cookies", href: "/legal/cookies" }, { label: "Accessibility", href: "/legal/accessibility" }],
  },
  terms: {
    eyebrow: "Legal information",
    title: "Terms",
    description: "Service and website terms will be published here after legal and operational review. This route is intentionally not presented as operative legal wording.",
    plannedSections: ["Website use", "Service scope", "Eligibility information", "Client responsibilities", "Intellectual property", "Liability", "Changes", "Contact"],
    links: [{ label: "Privacy", href: "/legal/privacy" }, { label: "Complaints", href: "/legal/complaints" }],
  },
  cookies: {
    eyebrow: "Legal information",
    title: "Cookies",
    description: "A future notice and preference interface will explain essential and optional technologies before any non-essential cookies are enabled.",
    plannedSections: ["What cookies are", "Essential technologies", "Optional technologies", "Retention", "Preference controls", "Updates"],
    links: [{ label: "Privacy", href: "/legal/privacy" }, { label: "Accessibility", href: "/legal/accessibility" }],
  },
  complaints: {
    eyebrow: "Legal information",
    title: "Complaints",
    description: "A transparent complaints process, response stages and escalation information will be published before the operational service launches.",
    plannedSections: ["How to complain", "Information to include", "Acknowledgement", "Review stages", "Response expectations", "Escalation"],
    links: [{ label: "Contact", href: "/contact" }, { label: "Support", href: "/support" }],
  },
  accessibility: {
    eyebrow: "Legal information",
    title: "Accessibility",
    description: "This foundation targets keyboard access, visible focus, semantic structure, reduced motion, robust contrast and clear routes to report barriers.",
    plannedSections: ["Conformance target", "How the platform is tested", "Known limitations", "Assistive technology", "Alternative formats", "Report a barrier"],
    links: [{ label: "Contact", href: "/contact" }, { label: "Privacy", href: "/legal/privacy" }],
  },
} satisfies Record<string, RouteFoundationContent>;
