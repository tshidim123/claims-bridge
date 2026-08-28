"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { operationalPriorities, operationalPriorityLabels } from "@/config/admin-claims";
import { addInternalNoteAction, assignClaimAction, setClaimPriorityAction, unassignClaimAction, type AdminClaimActionState } from "@/app/admin/claims/actions";

const initialState: AdminClaimActionState = { ok: false };

function SubmitButton({ children, pending }: { children: React.ReactNode; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return <button className="button button--small button--secondary" type="submit" disabled={isPending}><span className="button__label"><span className={isPending ? "admin-form-submit-label is-hidden" : "admin-form-submit-label"}>{children}</span><span className={isPending ? "admin-form-submit-pending" : "admin-form-submit-pending is-hidden"}>{pending}</span></span></button>;
}

function Feedback({ state }: { state: AdminClaimActionState }) {
  if (!state.message) return null;
  return <p className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.ok ? "status" : "alert"}>{state.message}</p>;
}

export function AdminClaimControls({ claimReference, currentPriority, currentStaffReference, assignableStaff }: { claimReference: string; currentPriority: (typeof operationalPriorities)[number]; currentStaffReference: string | null; assignableStaff: readonly { staffReference: string; displayName: string | null; roleLabel: string }[] }) {
  const [priorityState, priorityAction] = useActionState(setClaimPriorityAction, initialState);
  const [assignmentState, assignmentAction] = useActionState(assignClaimAction, initialState);
  const [unassignState, unassignAction] = useActionState(unassignClaimAction, initialState);
  return <div className="admin-control-stack">
    <section className="admin-control-panel" aria-labelledby="admin-priority-title"><p className="eyebrow">Operational attention</p><h2 id="admin-priority-title">Priority</h2><p>Controls staff workflow attention only. It does not represent legal merit, value or outcome.</p><form action={priorityAction} className="admin-inline-form"><input type="hidden" name="claimReference" value={claimReference} /><label htmlFor="claim-priority">Internal priority<select id="claim-priority" name="priority" defaultValue={currentPriority}>{operationalPriorities.map((priority) => <option value={priority} key={priority}>{operationalPriorityLabels[priority]}</option>)}</select></label><SubmitButton pending="Saving…">Set priority</SubmitButton></form><Feedback state={priorityState} /></section>
    <section className="admin-control-panel" aria-labelledby="admin-assignment-title"><p className="eyebrow">Responsible staff</p><h2 id="admin-assignment-title">Assignment</h2><p>{currentStaffReference ? "This claim has a current primary assignee." : "This claim is currently unassigned."}</p><div className="admin-assignment-actions"><form action={assignmentAction} className="admin-inline-form"><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="mode" value="self" /><SubmitButton pending="Assigning…">Assign to me</SubmitButton></form>{assignableStaff.length > 0 && <form action={assignmentAction} className="admin-inline-form"><input type="hidden" name="claimReference" value={claimReference} /><label htmlFor="claim-assignee">Assign to an active staff member<select id="claim-assignee" name="staffReference" defaultValue={currentStaffReference ?? ""}><option value="">Choose staff member</option>{assignableStaff.map((staff) => <option value={staff.staffReference} key={staff.staffReference}>{staff.displayName ?? "Claims Bridge staff"} · {staff.roleLabel}</option>)}</select></label><SubmitButton pending="Assigning…">Assign claim</SubmitButton></form>}{currentStaffReference && <form action={unassignAction} className="admin-inline-form"><input type="hidden" name="claimReference" value={claimReference} /><SubmitButton pending="Unassigning…">Unassign</SubmitButton></form>}</div><Feedback state={assignmentState.ok ? assignmentState : unassignState} /></section>
  </div>;
}

export function AdminInternalNoteForm({ claimReference }: { claimReference: string }) {
  const [state, action, pending] = useActionState(addInternalNoteAction, initialState);
  return <form action={action} className="admin-note-form"><label htmlFor="internal-note">Add a private internal note</label><textarea id="internal-note" name="body" maxLength={10000} placeholder="Record an operational observation for Claims Bridge staff only." aria-describedby="internal-note-help internal-note-status" disabled={pending} /><div className="admin-note-form__footer"><span id="internal-note-help">Plain text only · maximum 10,000 characters</span><input type="hidden" name="claimReference" value={claimReference} /><button className="button button--small button--primary" type="submit" disabled={pending}><span className="button__label">{pending ? "Adding…" : "Add private note"}</span></button></div><p id="internal-note-status" className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.message ? (state.ok ? "status" : "alert") : undefined}>{state.message}</p></form>;
}
