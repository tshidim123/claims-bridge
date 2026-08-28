import type { LegalSection } from "@/components/public/legal-page";

export const privacySections: readonly LegalSection[] = [
  { title: "Introduction", body: "This page provides the structure for the Claims Bridge privacy notice. It is written around the information the current platform may receive and the account boundaries it is designed to use." },
  { title: "Information a client may provide", body: "This may include information entered during eligibility, onboarding, claim, evidence and communication journeys. The final notice should describe the categories, purposes and lawful bases after formal review." },
  { title: "Account and claim information", body: "Authenticated account information can relate to a client profile, assessment, claim stage, timeline, evidence requirements, documents, messages and notifications." },
  { title: "Communications and evidence", body: "Messages and supporting records may contain sensitive tenancy information. The operational notice should explain access, use, sharing and retention precisely before launch." },
  { title: "Technical information", body: "The service may process information needed to operate, secure and improve the website and account experience. Specific technologies and optional tracking should be documented before they are enabled." },
  { title: "Access, security and retention", body: "Claims Bridge is designed with authenticated access and ownership boundaries. Exact retention periods, processors, transfers and security responsibilities require formal privacy review." },
  { title: "Rights and contact", body: "The final notice will explain applicable client rights and a monitored contact route. No unverified privacy contact details are published here." },
  { title: "Updates", body: "This policy architecture can be updated when the operational service, data flows or legal review changes." },
];

export const termsSections: readonly LegalSection[] = [
  { title: "Website use", body: "The public website provides general information about Claims Bridge and potential tenancy-deposit protection issues. It should not be treated as a substitute for advice about an individual situation." },
  { title: "Eligibility assessment", body: "The eligibility assessment is preliminary and depends on the information entered. It does not guarantee that a claim exists, will succeed or will result in compensation." },
  { title: "Account and claim records", body: "A client may choose to create an authenticated account and, where appropriate, a separate Claims Bridge claim record. Creating a claim does not establish liability or guarantee an outcome." },
  { title: "Information accuracy and communication", body: "Clients should provide information carefully and keep relevant records. Claims Bridge may request further information as a matter progresses through its workflow." },
  { title: "Service availability", body: "Features can depend on configuration and operational readiness. Public pages should describe live capabilities accurately and should not promise uninterrupted availability." },
  { title: "Prohibited misuse", body: "Users should not attempt to access another person’s account, claim or information, interfere with the service or submit malicious content." },
  { title: "Limitations and changes", body: "The final terms should explain service scope, limitations, intellectual property and changes after legal and operational review. No fees, representation relationship or jurisdiction are stated here." },
];

export const cookieSections: readonly LegalSection[] = [
  { title: "What this page covers", body: "Cookies and similar technologies should be described according to what the website and account actually use. This page avoids claiming that optional tracking is absent without a completed technical review." },
  { title: "Essential operation", body: "Some technologies may be needed for navigation, authentication, security or basic service operation. Their exact names, purposes and durations should be confirmed before publication." },
  { title: "Optional technologies", body: "No optional analytics, advertising or marketing technology is presented as active here. If that changes, the categories and preference controls should be updated before activation." },
  { title: "Preferences and updates", body: "A future preference interface can distinguish essential operation from optional technologies. This page will be updated when the implementation is known and reviewed." },
];

export const complaintsSections: readonly LegalSection[] = [
  { title: "Raise a service concern", body: "If something about the website, account experience or communication needs attention, use the available Support route. A monitored complaints channel will be published when configured." },
  { title: "Existing claim support", body: "Clients with an existing claim should use the authenticated workspace for claim-specific context where possible." },
  { title: "What to include", body: "A clear description of the concern and the relevant route can help Claims Bridge understand what needs reviewing. Do not send sensitive information through an unverified channel." },
  { title: "Response and escalation", body: "Response stages and any external escalation route will be published only after they are verified and operational. No unsupported response promise is made here." },
];
