import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

import { AdminAccessDenied } from "@/components/admin/admin-access-denied";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminQueueEmpty, AdminQueueLink, AdminQueueMeta, AdminQueuePagination, AdminQueueShell } from "@/components/admin/admin-operations-queue";
import { getAdminAssessmentQueue, getAdminPreAccountAssessmentQueue } from "@/lib/admin/operations/repository";
import { leadContactMethodLabels, type LeadContactMethod } from "@/lib/leads/validation";

export const metadata = { title: "Assessments", robots: { index: false, follow: false } };
const value = (input: string | string[] | undefined) => Array.isArray(input) ? input[0] : input;
const outcomes = ["REVIEW_RECOMMENDED", "MORE_INFORMATION_NEEDED", "INDIVIDUAL_REVIEW", "NO_DEPOSIT_PATH", "OUTSIDE_CURRENT_SCOPE"] as const;
const states = ["IN_PROGRESS", "REVIEW", "COMPLETE"] as const;
const label = (input: string | null) => input ? input.replaceAll("_", " ").toLowerCase() : "No outcome recorded";
const contactLabel = (input: string) => leadContactMethodLabels[input as LeadContactMethod] ?? input;

export default async function AdminAssessmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { userId } = await auth();
  if (!userId) return <AdminAccessDenied />;
  const raw = await searchParams;
  const filters = { search: value(raw.search), status: value(raw.status), outcome: value(raw.outcome), claim: value(raw.claim), from: value(raw.from), to: value(raw.to), sort: value(raw.sort) };
  let result;
  let preAccount;
  try {
    [result, preAccount] = await Promise.all([
      getAdminAssessmentQueue(userId, { ...filters, page: value(raw.page) }),
      getAdminPreAccountAssessmentQueue(userId, { search: filters.search, page: value(raw.page) }),
    ]);
  } catch {
    return <AdminAccessDenied forbidden />;
  }
  return <div className="admin-page">
    <AdminPageHeader eyebrow="Operations / assessments" title="All saved eligibility checks." description="Registered client assessments and durable pre-account assessments are shown as separate operational records." />
    <section className="admin-section" aria-labelledby="pre-account-assessments">
      <div className="admin-section__heading"><div><p className="eyebrow">Pre-account assessments</p><h2 id="pre-account-assessments">Saved before account creation</h2></div><span>{preAccount.total} record{preAccount.total === 1 ? "" : "s"}</span></div>
      <AdminQueueShell>{preAccount.items.length ? <ol className="admin-operations-list">{preAccount.items.map((item) => <li className="admin-queue-item" key={item.assessmentReference}><AdminQueueLink href={`/admin/assessments/${encodeURIComponent(item.assessmentReference)}`}><span><strong>{item.assessmentReference}</strong><em>{item.leadReference}</em></span><span className="admin-queue-item__state">{item.converted ? "Converted" : "Awaiting account"}</span></AdminQueueLink><AdminQueueMeta><span>{contactLabel(item.preferredContactMethod)}{item.email ? ` · ${item.email}` : ""}</span><span>{label(item.outcome)}</span><span>{new Date(item.createdAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</span></AdminQueueMeta></li>)}</ol> : <AdminQueueEmpty title="No pre-account assessments saved yet." description="A signed-out assessment appears here only after the renter submits the required contact details." />}</AdminQueueShell>
    </section>
    <form className="admin-queue-filters" method="get" aria-label="Filter assessments"><div className="admin-queue-search"><label htmlFor="assessment-search">Search assessments</label><input id="assessment-search" name="search" type="search" defaultValue={filters.search ?? ""} placeholder="CB-ASM reference, client, or CB-CLT reference" /></div><label htmlFor="assessment-status">State<select id="assessment-status" name="status" defaultValue={filters.status ?? ""}><option value="">Any state</option>{states.map((state) => <option key={state} value={state}>{label(state)}</option>)}</select></label><label htmlFor="assessment-outcome">Outcome<select id="assessment-outcome" name="outcome" defaultValue={filters.outcome ?? ""}><option value="">Any outcome</option>{outcomes.map((outcome) => <option key={outcome} value={outcome}>{label(outcome)}</option>)}</select></label><label htmlFor="assessment-claim">Claim state<select id="assessment-claim" name="claim" defaultValue={filters.claim ?? ""}><option value="">Any claim state</option><option value="NOT_STARTED">Claim not started</option><option value="STARTED">Claim started</option></select></label><label htmlFor="assessment-from">From<input id="assessment-from" name="from" type="date" defaultValue={filters.from ?? ""} /></label><label htmlFor="assessment-to">To<input id="assessment-to" name="to" type="date" defaultValue={filters.to ?? ""} /></label><label htmlFor="assessment-sort">Sort<select id="assessment-sort" name="sort" defaultValue={filters.sort ?? ""}><option value="">Most recently updated</option><option value="OLDEST">Oldest updated</option></select></label><div className="admin-queue-filter-actions"><button className="button button--small button--primary" type="submit">Apply filters</button><Link className="button button--small button--quiet" href="/admin/assessments">Clear</Link></div></form>
    <AdminQueueShell>{result.items.length ? <ol className="admin-operations-list">{result.items.map((item) => <li className="admin-queue-item" key={item.assessmentReference}><AdminQueueLink href={`/admin/assessments/${encodeURIComponent(item.assessmentReference)}`}><span><strong>{item.assessmentReference}</strong><em>{item.clientName} · {item.clientReference}</em></span><span className="admin-queue-item__state">{item.nextState}</span></AdminQueueLink><AdminQueueMeta><span>{label(item.status)}</span><span>{label(item.outcome)}</span><span>{item.claimReference ? `Claim ${item.claimReference}` : "No linked claim"}</span><span>{new Date(item.completedAt ?? item.updatedAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}</span></AdminQueueMeta></li>)}</ol> : <AdminQueueEmpty title="No assessments match this view." description="Registered assessments are shown only when persisted against a real client profile." />}<AdminQueuePagination result={result} pathname="/admin/assessments" params={filters} /></AdminQueueShell>
  </div>;
}
