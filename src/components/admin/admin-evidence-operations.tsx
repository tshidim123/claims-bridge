"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { evidenceRequirementConfig, evidenceRequirementPriorities, evidenceRequirementStatusLabels, evidenceRequirementTransitions, type EvidenceRequirementStatus, type EvidenceRequirementType } from "@/config/evidence";
import { requestEvidenceAction, reviewEvidenceAction, type AdminClaimActionState } from "@/app/admin/claims/actions";

const initialState: AdminClaimActionState = { ok: false };

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return <button className="button button--small button--secondary" type="submit" disabled={isPending}><span className="button__label">{isPending ? pending : label}</span></button>;
}

function ActionFeedback({ state }: { state: AdminClaimActionState }) {
  return state.message ? <p className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.ok ? "status" : "alert"}>{state.message}</p> : null;
}

export function AdminEvidenceRequestForm({ claimReference }: { claimReference: string }) {
  const [state, action] = useActionState(requestEvidenceAction, initialState);
  return <section className="admin-evidence-request" aria-labelledby="evidence-request-title"><p className="eyebrow">Evidence request</p><h2 id="evidence-request-title">Ask for one controlled evidence type.</h2><p>Requests are client-visible and use the established evidence descriptions. Identity documents are never selected automatically.</p><form action={action} className="admin-evidence-request__form"><input type="hidden" name="claimReference" value={claimReference} /><label htmlFor="evidence-type">Evidence type<select id="evidence-type" name="evidenceType" defaultValue="TENANCY_AGREEMENT">{(Object.keys(evidenceRequirementConfig) as EvidenceRequirementType[]).sort((a, b) => evidenceRequirementConfig[a].sortOrder - evidenceRequirementConfig[b].sortOrder).map((type) => <option value={type} key={type}>{evidenceRequirementConfig[type].label}{evidenceRequirementConfig[type].sensitivity === "sensitive" ? " · sensitive" : ""}</option>)}</select></label><label htmlFor="evidence-priority">Priority<select id="evidence-priority" name="priority" defaultValue="NORMAL">{evidenceRequirementPriorities.map((priority) => <option value={priority} key={priority}>{priority[0] + priority.slice(1).toLowerCase()}</option>)}</select></label><label htmlFor="evidence-due-date">Due date (optional)<input id="evidence-due-date" name="dueDate" type="date" /></label><label className="admin-checkbox"><input type="checkbox" name="required" value="true" defaultChecked /> Required for this workflow stage</label><SubmitButton label="Request evidence" pending="Requesting…" /></form><ActionFeedback state={state} /></section>;
}

export function AdminEvidenceRequirementActions({ claimReference, requirementReference, status, documentCount, storageAvailable }: { claimReference: string; requirementReference: string; status: EvidenceRequirementStatus; documentCount: number; storageAvailable: boolean }) {
  const [state, action] = useActionState(reviewEvidenceAction, initialState);
  const transitions = evidenceRequirementTransitions[status].filter((next) => next !== "UPLOADED");
  const reviewBlocked = !storageAvailable || documentCount === 0;
  return <div className="admin-review-actions">{transitions.map((next) => { const waiver = next === "WAIVED"; const disabled = !waiver && reviewBlocked; return <form action={action} key={next}><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="requirementReference" value={requirementReference} /><input type="hidden" name="requestedStatus" value={next} /><button className="button button--small button--quiet" type="submit" disabled={disabled}>{evidenceRequirementStatusLabels[next]}</button></form>; })}{reviewBlocked && transitions.some((next) => next !== "WAIVED") && <span className="admin-muted-note">Review actions require a linked validated document and secure binary access.</span>}<ActionFeedback state={state} /></div>;
}
