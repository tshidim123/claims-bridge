import "server-only";

import { render as renderEmail } from "@react-email/render";
import { and, eq, inArray, isNull, lte } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { emailOutbox, emailSuppressions } from "@/lib/db/schema/communications";
import { communicationEvents, type CommunicationEventKey } from "./registry";
import { resolveEmailRecipient } from "./recipients";

const MAX_ATTEMPTS = 5;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

export type AssessmentReceiptPayload = {
  assessmentReference: string;
  outcome: string;
  explanation: string;
  evidence: { label: string; description: string }[];
  continuationUrl: string;
};
export type WelcomePayload = { firstName?: string; accountUrl?: string };
export type ClaimCreatedPayload = {
  claimReference: string;
  stage: string;
  summary: string;
  claimUrl?: string;
  evidence: string[];
};
export type EvidenceRequestedPayload = {
  claimReference: string;
  requirementReference: string;
  title: string;
  description: string;
  dueDate?: string | null;
  evidenceUrl?: string;
};
export type ClaimStatusPayload = {
  claimReference: string;
  heading: string;
  summary: string;
  nextStep: string;
  actionRequired: boolean;
  claimUrl?: string;
};
export type DocumentReceivedPayload = {
  claimReference: string;
  documentReference: string;
  title: string;
  documentsUrl?: string;
};
export type DocumentActionPayload = {
  claimReference: string;
  documentReference: string;
  title: string;
  reason: string;
  documentsUrl?: string;
};
export type AssessmentAttachedPayload = {
  assessmentReference: string;
  outcome: string;
  assessmentUrl?: string;
};
export type SecureMessagePayload = {
  claimReference: string;
  messageReference: string;
  messagesUrl?: string;
};
export type ClientActionPayload = {
  claimReference: string;
  actionReference: string;
  title: string;
  description: string;
  dueDate?: string | null;
  actionUrl?: string;
};
export type EmailPayload =
  | AssessmentReceiptPayload
  | WelcomePayload
  | ClaimCreatedPayload
  | EvidenceRequestedPayload
  | ClaimStatusPayload
  | DocumentReceivedPayload
  | DocumentActionPayload
  | AssessmentAttachedPayload
  | SecureMessagePayload
  | ClientActionPayload
  | Record<string, never>;
export type EmailRecipient =
  | {
      mode: "SNAPSHOT";
      recipientType: "PRE_ACCOUNT";
      recipientReference: string;
      email: string;
    }
  | {
      mode: "DEFERRED";
      recipientType: "CLIENT" | "STAFF";
      recipientReference: string;
    };
export type EnqueueEmailInput = {
  event: CommunicationEventKey;
  recipient: EmailRecipient;
  payload: EmailPayload;
  dedupeKey: string;
};
type OutboxValues = typeof emailOutbox.$inferInsert;

function reference() {
  return `CB-EML-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}
export function normalizeEmailAddress(value: string) {
  const email = value.trim().toLowerCase();
  if (!emailPattern.test(email) || /[\r\n]/.test(email))
    throw new Error("Invalid email recipient.");
  return email;
}
function safeUrl(path: string | undefined, fallback: string) {
  return `${siteUrl()}${path?.startsWith("/") ? path : fallback}`;
}

const colour = {
  navy: "#102a43",
  teal: "#0b6e69",
  mist: "#eef5fb",
  ink: "#172033",
  muted: "#52616b",
  border: "#d8e2eb",
};
function Shell({
  preheader,
  children,
}: {
  preheader: string;
  children: React.ReactNode;
}) {
  return (
    <html>
      <body
        style={{
          margin: 0,
          backgroundColor: "#edf2f7",
          color: colour.ink,
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "none",
            maxHeight: 0,
            overflow: "hidden",
            opacity: 0,
          }}
        >
          {preheader}
        </div>
        <main
          style={{
            width: "100%",
            maxWidth: 620,
            margin: "28px auto",
            backgroundColor: "#fff",
            borderRadius: 18,
            overflow: "hidden",
            border: `1px solid ${colour.border}`,
          }}
        >
          <header
            style={{
              padding: "26px 34px",
              backgroundColor: colour.navy,
              color: "#fff",
            }}
          >
            <table role="presentation" width="100%">
              <tbody>
                <tr>
                  <td>
                    <strong style={{ fontSize: 22 }}>Claims Bridge</strong>
                    <div
                      style={{
                        marginTop: 5,
                        color: "#cfe8ee",
                        fontSize: 12,
                        letterSpacing: "0.8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Secure claim support
                    </div>
                  </td>
                  <td align="right" style={{ color: "#8fe1d9", fontSize: 12 }}>
                    claimsbridge.co.uk
                  </td>
                </tr>
              </tbody>
            </table>
          </header>
          <section style={{ padding: "32px 34px 20px" }}>{children}</section>
          <footer
            style={{
              padding: "22px 34px 30px",
              borderTop: `1px solid ${colour.border}`,
              color: colour.muted,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            Claims Bridge &middot;{" "}
            <a href={`${siteUrl()}/contact`} style={{ color: colour.teal }}>
              Support
            </a>{" "}
            &middot;{" "}
            <a href={`${siteUrl()}/privacy`} style={{ color: colour.teal }}>
              Privacy
            </a>{" "}
            &middot;{" "}
            <a href={`${siteUrl()}/terms`} style={{ color: colour.teal }}>
              Terms
            </a>
            <br />
            For your security, Claims Bridge will never ask you to share your
            account password by email.
          </footer>
        </main>
      </body>
    </html>
  );
}
function Hero({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        margin: "-32px -34px 26px",
        padding: "28px 34px",
        backgroundColor: "#f1fbfa",
        borderBottom: "1px solid #c9ebe7",
      }}
    >
      <p
        style={{
          margin: 0,
          color: colour.teal,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </p>
      <h1 style={{ margin: "9px 0 10px", fontSize: 27, lineHeight: 1.18 }}>
        {title}
      </h1>
      <div style={{ color: colour.muted, lineHeight: 1.55 }}>{children}</div>
    </section>
  );
}
function ReferenceCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        margin: "22px 0",
        padding: "16px 18px",
        borderRadius: 12,
        backgroundColor: colour.mist,
        border: `1px solid ${colour.border}`,
      }}
    >
      <div
        style={{
          color: colour.muted,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.6px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 5, fontSize: 19, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
function PrimaryButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <p style={{ margin: "24px 0" }}>
      <a
        href={href}
        style={{
          display: "inline-block",
          padding: "14px 19px",
          borderRadius: 8,
          backgroundColor: colour.teal,
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          textDecoration: "none",
        }}
      >
        {children}
      </a>
    </p>
  );
}
function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <section style={{ margin: "26px 0" }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>{title}</h2>
      <div
        style={{
          border: `1px solid ${colour.border}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            style={{
              padding: "12px 15px",
              borderBottom:
                index === items.length - 1
                  ? "none"
                  : `1px solid ${colour.border}`,
              color: colour.muted,
              lineHeight: 1.45,
            }}
          >
            <span style={{ color: colour.teal, fontWeight: 700 }}>✓</span>{" "}
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}
function Timeline({ items }: { items: string[] }) {
  return (
    <section style={{ margin: "26px 0" }}>
      <h2 style={{ fontSize: 18 }}>What happens next</h2>
      <ol style={{ paddingLeft: 21, color: colour.muted, lineHeight: 1.7 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </section>
  );
}
function SecurityNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderLeft: `4px solid ${colour.teal}`,
        backgroundColor: "#f6fbfb",
        color: colour.muted,
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

function AssessmentEmail({ payload }: { payload: AssessmentReceiptPayload }) {
  return (
    <Shell preheader="Your assessment has been saved. Review your result and prepare the documents needed to start your claim.">
      <Hero
        eyebrow="Eligibility assessment"
        title="We’ve received your eligibility assessment"
      >
        {payload.explanation}
      </Hero>
      <ReferenceCard
        label="Assessment reference"
        value={payload.assessmentReference}
      />
      <Checklist
        title="Documents to prepare"
        items={
          payload.evidence.length
            ? payload.evidence.map(
                (item) => `${item.label} — ${item.description}`,
              )
            : [
                "Review your saved assessment to see what supporting information may be useful.",
              ]
        }
      />
      <PrimaryButton href={payload.continuationUrl}>
        START CLAIM NOW
      </PrimaryButton>
      <Timeline
        items={[
          "Create or sign in to your secure account.",
          "Review the saved assessment and choose whether to start a claim.",
          "Upload supporting evidence when requested.",
        ]}
      />
      <SecurityNotice>
        You’ll need to create or sign in before starting a claim. An assessment
        is not a claim and does not guarantee an outcome.
      </SecurityNotice>
    </Shell>
  );
}
function WelcomeEmail({ payload }: { payload: WelcomePayload }) {
  const accountUrl = safeUrl(payload.accountUrl, "/account");
  return (
    <Shell preheader="Your secure Claims Bridge account is ready.">
      <Hero
        eyebrow="Your account"
        title={`Welcome${payload.firstName ? `, ${payload.firstName}` : ""} to Claims Bridge`}
      >
        Your secure account is ready for the next stage whenever you are.
      </Hero>
      <Checklist
        title="Your account gives you access to"
        items={[
          "Eligibility assessments and saved results",
          "Claims and supporting evidence",
          "Secure documents and messages",
          "Important account notifications",
        ]}
      />
      <PrimaryButton href={accountUrl}>OPEN MY ACCOUNT</PrimaryButton>
      <SecurityNotice>
        Having an account does not create a claim or guarantee an outcome. You
        stay in control of when to start a claim.
      </SecurityNotice>
    </Shell>
  );
}
function ClaimCreatedEmail({ payload }: { payload: ClaimCreatedPayload }) {
  const claimUrl = safeUrl(
    payload.claimUrl,
    `/account/claims/${encodeURIComponent(payload.claimReference)}`,
  );
  return (
    <Shell preheader="Your claim is now available in your secure Claims Bridge account.">
      <Hero eyebrow="Claim created" title="Your claim is now in your account">
        {payload.summary}
      </Hero>
      <ReferenceCard label="Claim reference" value={payload.claimReference} />
      <div
        style={{
          padding: "14px 16px",
          borderRadius: 12,
          backgroundColor: "#f6fbfb",
          color: colour.muted,
        }}
      >
        <strong style={{ color: colour.ink }}>Current stage: </strong>
        {payload.stage}
      </div>
      <Checklist
        title="Prepare supporting information"
        items={
          payload.evidence.length
            ? payload.evidence
            : [
                "Keep your tenancy, deposit and landlord or agent records available for the next review.",
              ]
        }
      />
      <PrimaryButton href={claimUrl}>VIEW MY CLAIM</PrimaryButton>
      <Timeline
        items={[
          "We will review the information currently available.",
          "We will tell you if supporting evidence or an action is needed.",
          "Use your secure account to follow the claim’s progress.",
        ]}
      />
      <SecurityNotice>
        Creating a claim starts the Claims Bridge workflow; it does not
        guarantee a legal or compensation outcome.
      </SecurityNotice>
    </Shell>
  );
}
function EvidenceRequestedEmail({
  payload,
}: {
  payload: EvidenceRequestedPayload;
}) {
  const evidenceUrl = safeUrl(
    payload.evidenceUrl,
    `/account/claims/${encodeURIComponent(payload.claimReference)}/evidence`,
  );
  return (
    <Shell preheader="Review the supporting information requested for your claim.">
      <Hero eyebrow="Action needed" title="Evidence has been requested">
        Please review the requested information in your secure account.
      </Hero>
      <ReferenceCard label="Claim reference" value={payload.claimReference} />
      <Checklist
        title="Requested evidence"
        items={[
          payload.title,
          payload.description,
          ...(payload.dueDate ? [`Due date: ${payload.dueDate}`] : []),
        ]}
      />
      <PrimaryButton href={evidenceUrl}>VIEW EVIDENCE REQUEST</PrimaryButton>
      <Timeline
        items={[
          "Open the secure evidence request.",
          "Upload the relevant supporting information.",
          "We will update your account when the review can continue.",
        ]}
      />
      <SecurityNotice>
        For your privacy, do not reply with documents to this email. Upload
        evidence only through your secure Claims Bridge account.
      </SecurityNotice>
    </Shell>
  );
}
function ClaimStatusEmail({
  payload,
  completed = false,
}: {
  payload: ClaimStatusPayload;
  completed?: boolean;
}) {
  const claimUrl = safeUrl(
    payload.claimUrl,
    `/account/claims/${encodeURIComponent(payload.claimReference)}`,
  );
  return (
    <Shell
      preheader={
        completed
          ? "Your Claims Bridge workflow has reached a completed state."
          : "There is an update in your secure Claims Bridge claim area."
      }
    >
      <Hero
        eyebrow={
          completed
            ? "Claim workflow complete"
            : payload.actionRequired
              ? "Action may be needed"
              : "Claim update"
        }
        title={payload.heading}
      >
        {payload.summary}
      </Hero>
      <ReferenceCard label="Claim reference" value={payload.claimReference} />
      <Checklist
        title={payload.actionRequired ? "What we need from you" : "Next step"}
        items={[payload.nextStep]}
      />
      <PrimaryButton href={claimUrl}>
        {completed ? "VIEW CLAIM SUMMARY" : "VIEW MY CLAIM"}
      </PrimaryButton>
      <SecurityNotice>
        {completed
          ? "Completion of the Claims Bridge workflow does not by itself confirm a legal, payment, or compensation outcome."
          : "Use your secure account for the latest claim information and any requested action."}
      </SecurityNotice>
    </Shell>
  );
}
function DocumentReceivedEmail({
  payload,
}: {
  payload: DocumentReceivedPayload;
}) {
  const documentsUrl = safeUrl(
    payload.documentsUrl,
    `/account/claims/${encodeURIComponent(payload.claimReference)}/documents`,
  );
  return (
    <Shell preheader="Your document has been securely received by Claims Bridge.">
      <Hero eyebrow="Document received" title="We’ve received your document">
        Your document has been recorded against your claim and will be handled
        through the secure review process.
      </Hero>
      <ReferenceCard label="Claim reference" value={payload.claimReference} />
      <Checklist title="Document received" items={[payload.title]} />
      <PrimaryButton href={documentsUrl}>VIEW DOCUMENTS</PrimaryButton>
      <Timeline
        items={[
          "Your document is available in your secure claim area.",
          "Claims Bridge will review it as part of the relevant workflow.",
          "We will let you know if anything else is needed.",
        ]}
      />
      <SecurityNotice>
        Received does not mean approved, accepted, or verified for an outcome.
      </SecurityNotice>
    </Shell>
  );
}
function DocumentActionEmail({ payload }: { payload: DocumentActionPayload }) {
  const documentsUrl = safeUrl(
    payload.documentsUrl,
    `/account/claims/${encodeURIComponent(payload.claimReference)}/documents`,
  );
  return (
    <Shell preheader="Please review a document request in your secure Claims Bridge account.">
      <Hero eyebrow="Action needed" title="A document needs your attention">
        Please review the request and provide the next document through your
        secure account.
      </Hero>
      <ReferenceCard label="Claim reference" value={payload.claimReference} />
      <Checklist
        title="Document request"
        items={[payload.title, payload.reason]}
      />
      <PrimaryButton href={documentsUrl}>REVIEW DOCUMENT REQUEST</PrimaryButton>
      <SecurityNotice>
        Upload a replacement only through your secure Claims Bridge account.
        This email does not include internal review notes.
      </SecurityNotice>
    </Shell>
  );
}
function AssessmentAttachedEmail({
  payload,
}: {
  payload: AssessmentAttachedPayload;
}) {
  const href = safeUrl(
    payload.assessmentUrl,
    `/account/assessments/${encodeURIComponent(payload.assessmentReference)}`,
  );
  return (
    <Shell preheader="Your saved eligibility assessment is available securely in your account.">
      <Hero
        eyebrow="Assessment linked"
        title="Your assessment is now linked to your account"
      >
        You do not need to complete this assessment again. Review it securely
        and choose whether to start a claim.
      </Hero>
      <ReferenceCard
        label="Assessment reference"
        value={payload.assessmentReference}
      />
      <Checklist title="Assessment result" items={[payload.outcome]} />
      <PrimaryButton href={href}>VIEW MY ASSESSMENT</PrimaryButton>
      <SecurityNotice>
        Linking an assessment does not create a claim or guarantee an outcome.
      </SecurityNotice>
    </Shell>
  );
}
function SecureMessageEmail({ payload }: { payload: SecureMessagePayload }) {
  const href = safeUrl(
    payload.messagesUrl,
    `/account/claims/${encodeURIComponent(payload.claimReference)}/messages`,
  );
  return (
    <Shell preheader="A new message is waiting in your secure Claims Bridge account.">
      <Hero eyebrow="Secure message" title="You have a new secure message">
        To protect your privacy, the message content is available only after you
        sign in to Claims Bridge.
      </Hero>
      <ReferenceCard label="Claim reference" value={payload.claimReference} />
      <PrimaryButton href={href}>VIEW SECURE MESSAGE</PrimaryButton>
      <SecurityNotice>
        Do not share account credentials by email. Use your secure account to
        read and reply.
      </SecurityNotice>
    </Shell>
  );
}
function ClientActionEmail({ payload }: { payload: ClientActionPayload }) {
  const href = safeUrl(
    payload.actionUrl,
    `/account/claims/${encodeURIComponent(payload.claimReference)}`,
  );
  return (
    <Shell preheader="Review the next step requested for your claim.">
      <Hero eyebrow="Action needed" title="Your claim needs your attention">
        Please complete the requested step in your secure Claims Bridge account.
      </Hero>
      <ReferenceCard label="Claim reference" value={payload.claimReference} />
      <Checklist
        title="Required action"
        items={[
          payload.title,
          payload.description,
          ...(payload.dueDate ? [`Due date: ${payload.dueDate}`] : []),
        ]}
      />
      <PrimaryButton href={href}>VIEW REQUIRED ACTION</PrimaryButton>
      <SecurityNotice>
        Only the secure account contains the current action details and any
        updates.
      </SecurityNotice>
    </Shell>
  );
}

type RenderableCommunicationEmailInput =
  | { event: "ASSESSMENT_RECEIVED"; payload: AssessmentReceiptPayload }
  | { event: "WELCOME"; payload: WelcomePayload }
  | { event: "CLAIM_CREATED"; payload: ClaimCreatedPayload }
  | { event: "EVIDENCE_REQUESTED"; payload: EvidenceRequestedPayload }
  | { event: "CLAIM_STATUS_UPDATED"; payload: ClaimStatusPayload }
  | { event: "CLAIM_COMPLETED"; payload: ClaimStatusPayload }
  | { event: "DOCUMENT_RECEIVED"; payload: DocumentReceivedPayload }
  | { event: "DOCUMENT_ACTION_REQUIRED"; payload: DocumentActionPayload }
  | {
      event: "ASSESSMENT_ATTACHED_TO_ACCOUNT";
      payload: AssessmentAttachedPayload;
    }
  | { event: "NEW_SECURE_MESSAGE"; payload: SecureMessagePayload }
  | { event: "CLIENT_ACTION_REQUIRED"; payload: ClientActionPayload };

type UnsupportedCommunicationEmailInput = {
  event: Exclude<
    CommunicationEventKey,
    RenderableCommunicationEmailInput["event"]
  >;
  payload: EmailPayload;
};

export type CommunicationEmailInput =
  RenderableCommunicationEmailInput | UnsupportedCommunicationEmailInput;

function unsupportedTemplate(): never {
  throw new Error("Email template is not implemented.");
}

export async function renderCommunicationEmail(input: CommunicationEmailInput) {
  switch (input.event) {
    case "ASSESSMENT_RECEIVED": {
      const item = input.payload;
      return {
        subject: `Your Claims Bridge eligibility assessment — ${item.assessmentReference}`,
        preheader:
          "Your assessment has been saved. Review your result and prepare the documents needed to start your claim.",
        html: await renderEmail(<AssessmentEmail payload={item} />),
        text: `We’ve received your eligibility assessment.\nAssessment reference: ${item.assessmentReference}\n\n${item.explanation}\n\nDocuments to prepare:\n${item.evidence.length ? item.evidence.map((entry) => `- ${entry.label}: ${entry.description}`).join("\n") : "- Review your saved assessment to see what supporting information may be useful."}\n\nStart claim: ${item.continuationUrl}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "WELCOME": {
      const item = input.payload;
      const url = safeUrl(item.accountUrl, "/account");
      return {
        subject: "Welcome to Claims Bridge",
        preheader: "Your secure Claims Bridge account is ready.",
        html: await renderEmail(<WelcomeEmail payload={item} />),
        text: `Welcome${item.firstName ? ` ${item.firstName}` : ""} to Claims Bridge.\n\nYour account gives you access to eligibility assessments, claims, evidence, documents, secure messages and notifications.\n\nOpen your account: ${url}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "CLAIM_CREATED": {
      const item = input.payload;
      const url = safeUrl(
        item.claimUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}`,
      );
      return {
        subject: `Your Claims Bridge claim has been created — ${item.claimReference}`,
        preheader:
          "Your claim is now available in your secure Claims Bridge account.",
        html: await renderEmail(<ClaimCreatedEmail payload={item} />),
        text: `Your Claims Bridge claim has been created.\nClaim reference: ${item.claimReference}\nCurrent stage: ${item.stage}\n\n${item.summary}\n\nPrepare: ${item.evidence.join(", ") || "Keep relevant tenancy, deposit and correspondence records available."}\n\nView your claim: ${url}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "EVIDENCE_REQUESTED": {
      const item = input.payload;
      const url = safeUrl(
        item.evidenceUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}/evidence`,
      );
      return {
        subject: `Evidence needed for your Claims Bridge claim — ${item.claimReference}`,
        preheader:
          "Review the supporting information requested for your claim.",
        html: await renderEmail(<EvidenceRequestedEmail payload={item} />),
        text: `Evidence has been requested for claim ${item.claimReference}.\n\nRequested: ${item.title}\n${item.description}${item.dueDate ? `\nDue date: ${item.dueDate}` : ""}\n\nView the evidence request: ${url}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "CLAIM_STATUS_UPDATED": {
      const item = input.payload;
      const url = safeUrl(
        item.claimUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}`,
      );
      return {
        subject: `${item.actionRequired ? "Action needed on" : "An update on"} your Claims Bridge claim — ${item.claimReference}`,
        preheader: item.summary,
        html: await renderEmail(<ClaimStatusEmail payload={item} />),
        text: `${item.heading}\nClaim reference: ${item.claimReference}\n\n${item.summary}\n\nNext step: ${item.nextStep}\n\nView your claim: ${url}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "CLAIM_COMPLETED": {
      const item = input.payload;
      const url = safeUrl(
        item.claimUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}`,
      );
      return {
        subject: `Your Claims Bridge claim workflow is complete — ${item.claimReference}`,
        preheader: "Your Claims Bridge workflow has reached a completed state.",
        html: await renderEmail(<ClaimStatusEmail payload={item} completed />),
        text: `${item.heading}\nClaim reference: ${item.claimReference}\n\n${item.summary}\n\nNext step: ${item.nextStep}\n\nView claim summary: ${url}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "DOCUMENT_RECEIVED": {
      const item = input.payload;
      const url = safeUrl(
        item.documentsUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}/documents`,
      );
      return {
        subject: `We received your document — ${item.claimReference}`,
        preheader: "Your document has been securely received by Claims Bridge.",
        html: await renderEmail(<DocumentReceivedEmail payload={item} />),
        text: `We received your document for claim ${item.claimReference}.\n\nDocument: ${item.title}\n\nReceived does not mean approved or accepted.\n\nView documents: ${url}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "DOCUMENT_ACTION_REQUIRED": {
      const item = input.payload;
      const url = safeUrl(
        item.documentsUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}/documents`,
      );
      return {
        subject: `Action needed on a document for your Claims Bridge claim — ${item.claimReference}`,
        preheader:
          "Please review a document request in your secure Claims Bridge account.",
        html: await renderEmail(<DocumentActionEmail payload={item} />),
        text: `A document needs your attention for claim ${item.claimReference}.\n\nDocument: ${item.title}\nReason: ${item.reason}\n\nReview document request: ${url}\n\nSupport: ${siteUrl()}/contact`,
      };
    }
    case "ASSESSMENT_ATTACHED_TO_ACCOUNT": {
      const item = input.payload;
      const url = safeUrl(
        item.assessmentUrl,
        `/account/assessments/${encodeURIComponent(item.assessmentReference)}`,
      );
      return {
        subject: "Your assessment is now linked to your Claims Bridge account",
        preheader:
          "Your saved eligibility assessment is available securely in your account.",
        html: await renderEmail(<AssessmentAttachedEmail payload={item} />),
        text: `Your assessment is now linked to your account.\nAssessment reference: ${item.assessmentReference}\nResult: ${item.outcome}\n\nView your assessment: ${url}`,
      };
    }
    case "NEW_SECURE_MESSAGE": {
      const item = input.payload;
      const url = safeUrl(
        item.messagesUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}/messages`,
      );
      return {
        subject: "New secure message from Claims Bridge",
        preheader:
          "A new message is waiting in your secure Claims Bridge account.",
        html: await renderEmail(<SecureMessageEmail payload={item} />),
        text: `You have a new secure message.\nClaim reference: ${item.claimReference}\n\nView secure message: ${url}`,
      };
    }
    case "CLIENT_ACTION_REQUIRED": {
      const item = input.payload;
      const url = safeUrl(
        item.actionUrl,
        `/account/claims/${encodeURIComponent(item.claimReference)}`,
      );
      return {
        subject: `Action needed on your Claims Bridge claim — ${item.claimReference}`,
        preheader: "Review the next step requested for your claim.",
        html: await renderEmail(<ClientActionEmail payload={item} />),
        text: `Action needed for claim ${item.claimReference}.\n\n${item.title}\n${item.description}${item.dueDate ? `\nDue date: ${item.dueDate}` : ""}\n\nView required action: ${url}`,
      };
    }
    default:
      return unsupportedTemplate();
  }
}

export function buildEmailOutboxValues(input: EnqueueEmailInput): OutboxValues {
  if (!input.recipient.recipientReference.trim())
    throw new Error("Recipient reference is required.");
  const definition = communicationEvents[input.event];
  return {
    emailReference: reference(),
    eventKey: input.event,
    dedupeKey: input.dedupeKey,
    recipientType: input.recipient.recipientType,
    recipientReference: input.recipient.recipientReference,
    recipientEmail:
      input.recipient.mode === "SNAPSHOT"
        ? normalizeEmailAddress(input.recipient.email)
        : null,
    templateKey: definition.template,
    templateVersion: definition.version,
    payload: input.payload,
    status: "PENDING",
    attemptCount: "0",
    availableAt: new Date(),
  };
}
export function assessmentReceiptValues(
  recipientEmail: string,
  recipientReference: string,
  payload: AssessmentReceiptPayload,
) {
  return buildEmailOutboxValues({
    event: "ASSESSMENT_RECEIVED",
    recipient: {
      mode: "SNAPSHOT",
      recipientType: "PRE_ACCOUNT",
      recipientReference,
      email: recipientEmail,
    },
    payload,
    dedupeKey: `ASSESSMENT_RECEIPT:${payload.assessmentReference}`,
  });
}
export async function enqueueEmail(input: EnqueueEmailInput) {
  const db = getDb();
  const values = buildEmailOutboxValues(input);
  const inserted = (
    await db
      .insert(emailOutbox)
      .values(values)
      .onConflictDoNothing({ target: emailOutbox.dedupeKey })
      .returning()
  )[0];
  return (
    inserted ??
    (
      await db
        .select()
        .from(emailOutbox)
        .where(eq(emailOutbox.dedupeKey, input.dedupeKey))
        .limit(1)
    )[0]
  );
}
async function deliver(record: typeof emailOutbox.$inferSelect) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CLAIMS_BRIDGE_FROM_EMAIL;
  if (!apiKey || !from)
    return { kind: "temporary" as const, code: "PROVIDER_NOT_CONFIGURED" };
  const resolved = record.recipientEmail
    ? { ok: true as const, email: record.recipientEmail }
    : await resolveEmailRecipient({
        type: record.recipientType as "CLIENT" | "STAFF" | "PRE_ACCOUNT",
        reference: record.recipientReference,
      });
  if (!resolved.ok)
    return {
      kind: resolved.retryable
        ? ("temporary" as const)
        : ("permanent" as const),
      code: resolved.code,
    };
  const suppressed = (
    await getDb()
      .select()
      .from(emailSuppressions)
      .where(
        and(
          eq(emailSuppressions.normalizedEmail, resolved.email),
          isNull(emailSuppressions.clearedAt),
        ),
      )
      .limit(1)
  )[0];
  if (suppressed)
    return { kind: "permanent" as const, code: "RECIPIENT_SUPPRESSED" };
  if (!record.recipientEmail)
    await getDb()
      .update(emailOutbox)
      .set({ recipientEmail: resolved.email, updatedAt: new Date() })
      .where(eq(emailOutbox.id, record.id));
  const message = await renderCommunicationEmail({
    event: record.eventKey as CommunicationEventKey,
    payload: record.payload as EmailPayload,
  } as CommunicationEmailInput);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [resolved.email],
      reply_to: process.env.CLAIMS_BRIDGE_REPLY_TO_EMAIL || undefined,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string };
  if (response.ok && body.id) return { kind: "sent" as const, id: body.id };
  return {
    kind:
      response.status >= 400 && response.status < 500
        ? ("permanent" as const)
        : ("temporary" as const),
    code: `RESEND_${response.status}`,
  };
}
export async function processNextEmail() {
  const db = getDb();
  const candidate = (
    await db
      .select()
      .from(emailOutbox)
      .where(
        and(
          inArray(emailOutbox.status, ["PENDING", "RETRY"]),
          lte(emailOutbox.availableAt, new Date()),
        ),
      )
      .limit(1)
  )[0];
  if (!candidate) return null;
  const claimed = (
    await db
      .update(emailOutbox)
      .set({
        status: "PROCESSING",
        processingStartedAt: new Date(),
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(emailOutbox.id, candidate.id),
          inArray(emailOutbox.status, ["PENDING", "RETRY"]),
        ),
      )
      .returning()
  )[0];
  if (!claimed) return null;
  const result = await deliver(claimed);
  const attempts = Number(claimed.attemptCount) + 1;
  const failed = result.kind === "permanent" || attempts >= MAX_ATTEMPTS;
  return db
    .update(emailOutbox)
    .set(
      result.kind === "sent"
        ? {
            status: "SENT",
            attemptCount: String(attempts),
            sentAt: new Date(),
            providerMessageId: result.id,
            lastErrorCode: null,
            updatedAt: new Date(),
          }
        : {
            status: failed ? "FAILED" : "RETRY",
            attemptCount: String(attempts),
            availableAt: new Date(
              Date.now() + Math.min(3_600_000, 2 ** attempts * 60_000),
            ),
            failedAt: failed ? new Date() : null,
            lastErrorCode: result.code,
            updatedAt: new Date(),
          },
    )
    .where(eq(emailOutbox.id, claimed.id));
}
