"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { completeClientActionAction, type ClientActionState } from "@/app/account/claims/[claimId]/actions";
import { clientActionConfig, type ClientActionStatus, type ClientActionType } from "@/config/client-actions";

type ActionItem = { actionReference: string; type: ClientActionType; title: string; description: string; status: ClientActionStatus; priority: "NORMAL" | "IMPORTANT"; dueAt: string | null; clientCanComplete: boolean; createdAt: string };

function CompleteButton() { const { pending } = useFormStatus(); return <button className="button button--small button--primary" type="submit" disabled={pending}>{pending ? "Updating…" : "Mark complete"}</button>; }

function ActionCard({ action, claimReference }: { action: ActionItem; claimReference: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ClientActionState, FormData>(completeClientActionAction, { ok: false });
  useEffect(() => { if (state.ok) router.refresh(); }, [state.ok, router]);
  const open = action.status === "OPEN";
  return <li className={`client-action-card client-action-card--${action.priority.toLowerCase()}`}><div className="client-action-card__rail" aria-hidden="true" /><div className="client-action-card__body"><div className="client-action-card__meta"><span>{clientActionConfig[action.type].label}</span><span>{open ? (action.priority === "IMPORTANT" ? "Important" : "Open") : action.status === "COMPLETED" ? "Completed" : "Cancelled"}</span></div><h3>{action.title}</h3><p>{action.description}</p>{action.dueAt && open && <p className="client-action-card__due">Consider this by {new Date(action.dueAt).toLocaleDateString("en-GB", { dateStyle: "medium" })}.</p>}{open && action.clientCanComplete && <form action={formAction}><input type="hidden" name="claimReference" value={claimReference} /><input type="hidden" name="actionReference" value={action.actionReference} /><CompleteButton /><p className="client-action-card__feedback" role={state.message ? state.ok ? "status" : "alert" : undefined}>{state.message}</p></form>}{open && !action.clientCanComplete && <p className="client-action-card__note">Claims Bridge will review this action with you.</p>}</div></li>;
}

export function ClientActionList({ claimReference, actions }: { claimReference: string; actions: ActionItem[] }) {
  if (actions.length === 0) return null;
  const open = actions.filter((action) => action.status === "OPEN");
  return <section id="client-actions" className="client-action-list" aria-labelledby="client-actions-title"><div className="client-action-list__heading"><div><p className="eyebrow">Structured next steps</p><h2 id="client-actions-title">Actions requiring your attention</h2></div><span>{open.length} open</span></div><p className="client-action-list__intro">These are general actions connected to your Claims Bridge claim. They are separate from evidence requests and secure messages.</p><ol>{actions.map((action) => <ActionCard key={action.actionReference} action={action} claimReference={claimReference} />)}</ol></section>;
}
