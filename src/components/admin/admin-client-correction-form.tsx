"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateClientOperationalProfileAction, type ClientCorrectionState } from "@/app/admin/clients/actions";

const initial: ClientCorrectionState = { ok: false };
function Submit() { const { pending } = useFormStatus(); return <button className="button button--small button--primary" type="submit" disabled={pending}>{pending ? "Saving…" : "Save client details"}</button>; }

export function AdminClientCorrectionForm({ profile }: { profile: { clientReference: string; firstName: string; lastName: string; phone: string | null; preferredContactMethod: string; updatedAt: string } }) {
  const [state, action] = useActionState(updateClientOperationalProfileAction, initial);
  return <section className="admin-management-panel" aria-labelledby="client-correction-title"><p className="eyebrow">Controlled correction</p><h2 id="client-correction-title">Edit client details</h2><p>Only low-risk operational contact fields can be corrected here. Identity, ownership, assessments and claim history remain protected.</p><form action={action} className="admin-management-form"><input type="hidden" name="clientReference" value={profile.clientReference} /><input type="hidden" name="expectedUpdatedAt" value={profile.updatedAt} /><label>First name<input name="firstName" defaultValue={profile.firstName} maxLength={100} required /></label><label>Last name<input name="lastName" defaultValue={profile.lastName} maxLength={100} required /></label><label>Phone <span className="admin-muted-note">optional</span><input name="phone" defaultValue={profile.phone ?? ""} maxLength={40} /></label><label>Preferred contact method<select name="preferredContactMethod" defaultValue={profile.preferredContactMethod}><option value="email">Email</option><option value="phone">Phone</option></select></label><div><Submit /></div></form>{state.message && <p className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.ok ? "status" : "alert"}>{state.message}</p>}</section>;
}
