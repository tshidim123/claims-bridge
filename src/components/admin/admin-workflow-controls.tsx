"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { claimStatusConfig, type ClaimStatus } from "@/config/claim-statuses";
import { getTransitionTimeline } from "@/config/claim-tracking";
import { claimStatusNotificationTypes, notificationDefinitions } from "@/config/notifications";
import { transitionClaimStatusAction, type AdminClaimActionState } from "@/app/admin/claims/actions";

const initialState: AdminClaimActionState = { ok: false };

function WorkflowSubmitButton({ pending }: { pending: boolean }) {
  const status = useFormStatus();
  return <button className="button button--small button--primary" type="submit" disabled={pending || status.pending}><span className="button__label">{pending || status.pending ? "Applying…" : "Apply workflow transition"}</span></button>;
}

export function AdminWorkflowControls({ claimReference, currentStatus, allowedTransitions }: { claimReference: string; currentStatus: ClaimStatus; allowedTransitions: readonly ClaimStatus[] }) {
  const [selected, setSelected] = useState<ClaimStatus | "">(allowedTransitions[0] ?? "");
  const [state, action, pending] = useActionState(transitionClaimStatusAction, initialState);
  const target = selected ? claimStatusConfig[selected] : null;
  const timeline = selected ? getTransitionTimeline(selected) : null;
  const notificationType = selected ? claimStatusNotificationTypes[selected] : null;
  const notification = notificationType ? notificationDefinitions[notificationType] : null;
  const highImpact = Boolean(target?.terminal);

  return <section className="admin-workflow-panel" aria-labelledby="admin-workflow-title"><div className="admin-section__heading"><div><p className="eyebrow">Workflow controls</p><h2 id="admin-workflow-title">Move this claim through its current path.</h2></div><span className="admin-workflow-state">{allowedTransitions.length} available</span></div>{allowedTransitions.length === 0 ? <p className="admin-muted-note">No further status transition is currently available.</p> : <form action={action} className="admin-workflow-form"><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="requestedStatus" value={selected} /><label htmlFor="workflow-transition">Next permitted status<select id="workflow-transition" value={selected} onChange={(event) => setSelected(event.target.value as ClaimStatus)}>{allowedTransitions.map((status) => <option value={status} key={status}>{claimStatusConfig[status].label}</option>)}</select></label>{target && <div className="admin-workflow-preview" aria-live="polite"><p className="eyebrow">Client effect preview</p><dl><div><dt>From</dt><dd>{claimStatusConfig[currentStatus].label}</dd></div><div><dt>To</dt><dd>{target.label}</dd></div><div><dt>Stage</dt><dd>{target.stage.replaceAll("_", " ")}</dd></div><div><dt>Waiting on</dt><dd>{target.description}</dd></div></dl><p>{timeline ? `Timeline: ${timeline.title}.` : "No client timeline event is configured for this transition."} {notification ? `Notification: ${notification.title}.` : "No client notification is configured for this transition."}</p></div>}{highImpact && <label className="admin-confirmation"><input type="checkbox" name="confirmed" value="true" required /> I confirm this terminal workflow transition.</label>}<WorkflowSubmitButton pending={pending} /><p className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.message ? state.ok ? "status" : "alert" : undefined}>{state.message}</p></form>}</section>;
}
