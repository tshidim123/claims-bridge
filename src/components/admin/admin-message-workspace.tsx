"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";

import { MAX_MESSAGE_LENGTH } from "@/config/messaging";
import { loadEarlierStaffMessagesAction, sendStaffMessageAction, setStaffConversationStatusAction, type AdminClaimActionState } from "@/app/admin/claims/actions";

type Message = { id: string; sender: string; messageType: string; body: string; createdAt: string };
type Workspace = { claimReference: string; conversation: { status: "OPEN" | "CLOSED"; messageCount: number } | null; messages: Message[]; nextCursor: string | null; unreadClientMessages: number; canReply: boolean; canManageConversation: boolean };
const initialState: AdminClaimActionState = { ok: false };
function Submit({ label, pending }: { label: string; pending: string }) { const { pending: busy } = useFormStatus(); return <button className="button button--small button--primary" type="submit" disabled={busy}>{busy ? pending : label}</button>; }

export function AdminMessageWorkspace({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const [messages, setMessages] = useState(workspace.messages);
  const [cursor, setCursor] = useState(workspace.nextCursor);
  const [loading, startTransition] = useTransition();
  const [replyState, reply] = useActionState(sendStaffMessageAction, initialState);
  const [conversationState, conversationAction] = useActionState(setStaffConversationStatusAction, initialState);
  const [requestId] = useState(() => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `staff-${Date.now()}`);
  useEffect(() => { if (replyState.ok || conversationState.ok) router.refresh(); }, [replyState.ok, conversationState.ok, router]);
  function loadEarlier() { if (!cursor || loading) return; startTransition(async () => { const result = await loadEarlierStaffMessagesAction(workspace.claimReference, cursor); if (result) { setMessages((current) => [...result.messages, ...current]); setCursor(result.nextCursor); } }); }
  const status = workspace.conversation?.status ?? "OPEN";
  return <div className="admin-messaging-workspace"><section className="admin-message-context"><div><p className="eyebrow">Secure correspondence</p><h2>{workspace.conversation ? `${status === "OPEN" ? "Open" : "Closed"} conversation` : "No conversation yet"}</h2></div><p>{workspace.unreadClientMessages ? `${workspace.unreadClientMessages} unread client message${workspace.unreadClientMessages === 1 ? "" : "s"} for you.` : "Client read state is tracked per staff member."}</p></section>{workspace.canManageConversation && workspace.conversation && <form action={conversationAction} className="admin-conversation-controls"><input type="hidden" name="claimReference" value={workspace.claimReference} /><input type="hidden" name="status" value={status === "OPEN" ? "CLOSED" : "OPEN"} />{status === "OPEN" ? <label className="admin-confirmation"><input type="checkbox" name="confirmed" value="true" required /> Confirm closing this correspondence channel.</label> : null}<Submit label={status === "OPEN" ? "Close conversation" : "Reopen conversation"} pending="Updating…" /><p className="admin-form-feedback" role={conversationState.message ? conversationState.ok ? "status" : "alert" : undefined}>{conversationState.message}</p></form>}{cursor && <button className="button button--quiet button--medium admin-message-load" type="button" onClick={loadEarlier} disabled={loading}>{loading ? "Loading…" : "Load earlier messages"}</button>}{messages.length ? <ol className="admin-message-thread" aria-label="Client correspondence">{messages.map((message) => <li key={message.id}><article><div><strong>{message.sender}</strong><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></div><p>{message.body}</p></article></li>)}</ol> : <p className="admin-muted-note">No client-visible messages are recorded for this claim.</p>}{status === "OPEN" && workspace.canReply ? <form action={reply} className="admin-message-composer"><input type="hidden" name="claimReference" value={workspace.claimReference} /><input type="hidden" name="requestId" value={requestId} /><label htmlFor="staff-message-body">Message to client</label><textarea id="staff-message-body" name="body" maxLength={MAX_MESSAGE_LENGTH} required placeholder="Write a clear plain-text reply." /><div><span>Plain text only · maximum {MAX_MESSAGE_LENGTH.toLocaleString()} characters</span><Submit label="Send as Claims Bridge" pending="Sending…" /></div><p className="admin-form-feedback" role={replyState.message ? replyState.ok ? "status" : "alert" : undefined}>{replyState.message}</p></form> : status === "CLOSED" ? <section className="admin-message-closed"><p className="eyebrow">Correspondence closed</p><p>Reopen the conversation before sending a reply.</p></section> : <p className="admin-muted-note">You have read access to this correspondence but not reply permission.</p>}</div>;
}
