"use client";

import { useState } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { canTransitionDocumentStatus, documentStatusLabels, type DocumentStatus } from "@/config/evidence";
import { reviewDocumentAction, type AdminClaimActionState } from "@/app/admin/claims/actions";

const initialState: AdminClaimActionState = { ok: false };

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return <button className="button button--small button--quiet" type="submit" disabled={isPending}><span className="button__label">{isPending ? pending : label}</span></button>;
}

export function AdminDocumentReviewControls({ claimReference, documentReference, status, securityStatus, reviewAvailable }: { claimReference: string; documentReference: string | null; status: DocumentStatus; securityStatus: string; reviewAvailable: boolean }) {
  const [selected, setSelected] = useState<DocumentStatus | "">("");
  const [state, action] = useActionState(reviewDocumentAction, initialState);
  const transitions = (["UNDER_REVIEW", "ACCEPTED", "REPLACEMENT_REQUESTED", "REJECTED"] as DocumentStatus[]).filter((next) => canTransitionDocumentStatus(status, next));
  if (!documentReference || !reviewAvailable || securityStatus !== "VALIDATED") return <p className="admin-muted-note">Review unavailable: {securityStatus === "VALIDATED" && !reviewAvailable ? "secure binary access is not configured." : "the document must be technically validated first."}</p>;
  if (transitions.length === 0) return <p className="admin-muted-note">No further review action is available.</p>;
  const requiresConfirmation = selected === "REJECTED" || selected === "REPLACEMENT_REQUESTED";
  return <form action={action} className="admin-document-review-form"><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="documentReference" value={documentReference} /><label htmlFor={`document-action-${documentReference}`}>Review action<select id={`document-action-${documentReference}`} name="requestedStatus" value={selected} onChange={(event) => setSelected(event.target.value as DocumentStatus)} required><option value="">Choose action</option>{transitions.map((next) => <option value={next} key={next}>{documentStatusLabels[next]}</option>)}</select></label>{requiresConfirmation && <label className="admin-confirmation"><input type="checkbox" name="confirmed" value="true" required /> Confirm this document review outcome.</label>}<SubmitButton label="Apply review action" pending="Updating…" /><p className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.message ? state.ok ? "status" : "alert" : undefined}>{state.message}</p></form>;
}
