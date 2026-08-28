"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { staffRoleLabels, staffRoles, rolePermissions, type StaffRole, type StaffStatus } from "@/config/staff";
import { changeStaffRoleAction, provisionStaffAction, reactivateStaffAction, suspendStaffAction, type StaffActionState } from "@/app/admin/team/actions";

const initial: StaffActionState = { ok: false };
function Submit({ children, pending }: { children: React.ReactNode; pending: string }) { const { pending: busy } = useFormStatus(); return <button className="button button--small button--secondary" type="submit" disabled={busy}>{busy ? pending : children}</button>; }
function Feedback({ state }: { state: StaffActionState }) { return state.message ? <p className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.ok ? "status" : "alert"}>{state.message}</p> : null; }

export function AdminStaffProvisioningForm() {
  const [state, action] = useActionState(provisionStaffAction, initial);
  return <section className="admin-management-panel" aria-labelledby="provision-staff-title"><p className="eyebrow">Grant access</p><h2 id="provision-staff-title">Register an existing Clerk identity.</h2><p>Enter the exact email of an existing, verified account. Claims Bridge will not create an account or send an invitation.</p><form action={action} className="admin-management-form"><label>Email address<input name="email" type="email" autoComplete="off" required maxLength={320} /></label><label>Display name <span className="admin-muted-note">optional</span><input name="displayName" type="text" maxLength={120} /></label><label>Initial role<select name="role" defaultValue="READ_ONLY">{staffRoles.map((role) => <option value={role} key={role}>{staffRoleLabels[role]} · {rolePermissions[role].length} capabilities</option>)}</select></label><Submit pending="Verifying…">Grant staff access</Submit></form><Feedback state={state} /></section>;
}

export function AdminStaffRowActions({ staffReference, displayName, role, status }: { staffReference: string; displayName: string | null; role: StaffRole; status: StaffStatus }) {
  const [roleState, roleAction] = useActionState(changeStaffRoleAction, initial); const [suspendState, suspendAction] = useActionState(suspendStaffAction, initial); const [reactivateState, reactivateAction] = useActionState(reactivateStaffAction, initial); const label = displayName ?? "this staff member";
  return <div className="admin-staff-actions"><form action={roleAction} className="admin-management-form admin-management-form--compact"><input type="hidden" name="staffReference" value={staffReference} /><label>Change role for {label}<select name="role" defaultValue={role}>{staffRoles.map((item) => <option value={item} key={item}>{staffRoleLabels[item]}</option>)}</select></label><label className="admin-confirmation"><input type="checkbox" name="confirmed" value="true" required /> Confirm this access change.</label><Submit pending="Saving…">Change role</Submit></form><Feedback state={roleState} />{status === "ACTIVE" ? <form action={suspendAction} className="admin-management-form admin-management-form--compact"><input type="hidden" name="staffReference" value={staffReference} /><label className="admin-confirmation"><input type="checkbox" name="confirmed" value="true" required /> Confirm suspension of {label}.</label><Submit pending="Suspending…">Suspend {label}</Submit></form> : <form action={reactivateAction} className="admin-management-form admin-management-form--compact"><input type="hidden" name="staffReference" value={staffReference} /><Submit pending="Reactivating…">Reactivate {label}</Submit></form>}<Feedback state={suspendState.ok ? suspendState : reactivateState} /></div>;
}
