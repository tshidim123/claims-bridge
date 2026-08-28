import Link from "next/link";
import { EditorialSection, PublicCta, PublicHero, RelatedResources, ScopeNotice, IssueSignals } from "@/components/public/public-editorial";
import { createPublicMetadata, publicCtas, publicMetadata, publicScope } from "@/config/public-site";

export const metadata = createPublicMetadata(...publicMetadata.depositClaims, "/deposit-claims");

const issues = [
  ["01", "Deposit may not be protected", "When no scheme record or certificate can be found.", "/deposit-claims/not-protected"],
  ["02", "Protection may have happened late", "When the dates across a tenancy and scheme record need a closer look.", "/deposit-claims/late-protection"],
  ["03", "Information may be missing", "When deposit-protection documents or details are incomplete.", "/deposit-claims/missing-information"],
  ["04", "The scheme cannot be found", "When a deposit was paid but the protection route remains unclear.", "/deposit-claims/cant-find-my-deposit"],
] as const;

export default function DepositClaimsPage() {
  return <article className="public-page public-service-page"><PublicHero eyebrow="Deposit claims" title="The protection question is often hidden in the paperwork." description="Claims Bridge helps renters understand potential tenancy-deposit protection issues, organise what they know and decide whether a fuller claim route may be appropriate." actions={[publicCtas.checkEligibility, publicCtas.howItWorks]} /><EditorialSection eyebrow="Four places to begin" title="Find the question closest to your situation."><div className="public-issue-index">{issues.map(([index, title, description, href]) => <Link href={href} key={href}><span>{index}</span><div><h3>{title}</h3><p>{description}</p></div><span aria-hidden="true">↗</span></Link>)}</div></EditorialSection><EditorialSection eyebrow="What Claims Bridge does" title="Structure first. Conclusions later."><div className="public-two-column"><IssueSignals signals={publicScope.helpsWith} /><ScopeNotice>{"Claims Bridge does not treat an initial indication as a guaranteed claim. "}A fuller assessment may require more information and evidence.</ScopeNotice></div></EditorialSection><EditorialSection eyebrow="A focused service" title="Support after the initial check."><p className="public-reading-copy">A preliminary assessment is only the beginning. Where the circumstances are suitable, the client workspace can help keep the claim record, stage, evidence, messages and next steps visible in one secure account.</p><RelatedResources links={[{ label: "Knowledge Hub", href: "/knowledge-hub", description: "Read practical guidance before deciding what to do." }, { label: "How it works", href: "/how-it-works", description: "Follow the journey from first check to progress." }, { label: "Deposit protection guide", href: "/guides/deposit-protection", description: "Build a clearer understanding of the records involved." }]} /></EditorialSection><PublicCta /></article>;
}
