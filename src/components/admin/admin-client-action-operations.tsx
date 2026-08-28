"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { clientActionConfig, clientActionTypes, type ClientActionType } from "@/config/client-actions";
import { cancelClientActionAction, completeClientActionAction, createClientActionAction, type AdminClaimActionState } from "@/app/admin/claims/actions";

const initialState: AdminClaimActionState = { ok: false };
function Submit({ label, pending }: { label: string; pending: string }) { const { pending: busy } = useFormStatus(); return <button className="button button--small button--secondary" type="submit" disabled={busy}>{busy ? pending : label}</button>; }
function Feedback({ state }: { state: AdminClaimActionState }) { return state.message ? <p className={state.ok ? "admin-form-feedback" : "admin-form-feedback admin-form-feedback--error"} role={state.ok ? "status" : "alert"}>{state.message}</p> : null; }

export function AdminClientActionCreate({ claimReference }: { claimReference: string }) {
  const [state, action] = useActionState(createClientActionAction, initialState);
  const [requestId] = useState(() => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `action-${Date.now()}`);
  return <section className="admin-action-create" aria-labelledby="admin-action-create-title"><p className="eyebrow">Client action</p><h2 id="admin-action-create-title">Create a structured next step</h2><p>Use this for a non-evidence task that the client needs to complete. Evidence requests belong in the Evidence workspace.</p><form action={action} className="admin-action-form"><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="requestId" value={requestId} /><label htmlFor="client-action-type">Action type<select id="client-action-type" name="type" defaultValue="CONFIRM_INFORMATION">{clientActionTypes.map((type) => <option key={type} value={type}>{clientActionConfig[type].label}</option>)}</select></label><label htmlFor="client-action-title">Client-facing title<input id="client-action-title" name="title" maxLength={160} required placeholder="For example, confirm information" /></label><label htmlFor="client-action-description">Instructions<textarea id="client-action-description" name="description" maxLength={5000} required placeholder="Explain what the client should do in plain language." /></label><div className="admin-action-form__row"><label htmlFor="client-action-priority">Priority<select id="client-action-priority" name="priority" defaultValue="NORMAL"><option value="NORMAL">Normal</option><option value="IMPORTANT">Important</option></select></label><label htmlFor="client-action-due">Due date (optional)<input id="client-action-due" name="dueDate" type="date" /></label></div><Submit label="Create client action" pending="Creating…" /></form><Feedback state={state} /></section>;
}

type ActionItem = { actionReference: string; type: ClientActionType; title: string; description: string; status: "OPEN" | "COMPLETED" | "CANCELLED"; priority: "NORMAL" | "IMPORTANT"; dueAt: string | null; createdAt: string; completedAt: string | null; cancelledAt: string | null };
export function AdminClientActionList({ claimReference, actions, canManage }: { claimReference: string; actions: ActionItem[]; canManage: boolean }) {
  return <section className="admin-action-list" aria-labelledby="admin-action-list-title"><div className="admin-section__heading"><div><p className="eyebrow">Client-facing task rail</p><h2 id="admin-action-list-title">General actions</h2></div><span>{actions.filter((action) => action.status === "OPEN").length} open</span></div>{actions.length === 0 ? <p className="admin-muted-note">No general client actions are recorded for this claim.</p> : <ol>{actions.map((item) => <AdminActionRow key={item.actionReference} item={item} claimReference={claimReference} canManage={canManage} />)}</ol>}</section>;
}

function AdminActionRow({ item, claimReference, canManage }: { item: ActionItem; claimReference: string; canManage: boolean }) {
  const router = useRouter();
  const [completeState, complete] = useActionState(completeClientActionAction, initialState);
  const [cancelState, cancel] = useActionState(cancelClientActionAction, initialState);
  useEffect(() => { if (completeState.ok || cancelState.ok) router.refresh(); }, [completeState.ok, cancelState.ok, router]);
  return <li className="admin-action-row"><div><div className="admin-action-row__meta"><span>{clientActionConfig[item.type].label}</span><span>{item.priority === "IMPORTANT" ? "Important" : item.status}</span></div><h3>{item.title}</h3><p>{item.description}</p><small>{item.actionReference}{item.dueAt ? ` · due ${new Date(item.dueAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}` : ""}</small></div>{item.status === "OPEN" && canManage && <div className="admin-action-row__controls"><form action={complete}><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="actionReference" value={item.actionReference} /><Submit label="Complete" pending="Updating…" /></form><form action={cancel}><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="actionReference" value={item.actionReference} /><Submit label="Cancel" pending="Updating…" /></form><Feedback state={completeState.message ? completeState : cancelState} /></div>}</li>;
}
