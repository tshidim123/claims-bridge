"use client";

import { FormEvent, useRef, useState } from "react";

import { MAX_MESSAGE_LENGTH, messageSenderLabels } from "@/config/messaging";

type Message = { id: string; senderType: keyof typeof messageSenderLabels; messageType: "MESSAGE" | "SYSTEM_UPDATE"; body: string; createdAt: string };

export function MessageCenter({ claimReference, conversationStatus, initialMessages, initialNextCursor }: { claimReference: string; conversationStatus: "OPEN" | "CLOSED"; initialMessages: Message[]; initialNextCursor: string | null }) {
  const [messages, setMessages] = useState(initialMessages);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function loadEarlier() {
    if (!nextCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    setError("");
    try {
      const response = await fetch(`/api/account/claims/${encodeURIComponent(claimReference)}/messages?before=${encodeURIComponent(nextCursor)}`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "We couldn't load earlier messages.");
      setMessages((current) => [...(result.messages ?? []), ...current]);
      setNextCursor(typeof result.nextCursor === "string" ? result.nextCursor : null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "We couldn't load earlier messages.");
    } finally {
      setLoadingEarlier(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || conversationStatus !== "OPEN") return;
    setSending(true);
    setError("");
    setStatus("Sending your message…");
    try {
      const response = await fetch(`/api/account/claims/${encodeURIComponent(claimReference)}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, requestId: crypto.randomUUID() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.message) throw new Error(typeof result.error === "string" ? result.error : "We couldn't send your message. Please try again.");
      setMessages((current) => current.some((message) => message.id === result.message.id) ? current : [...current, result.message]);
      setBody("");
      setStatus("Message sent.");
      textareaRef.current?.focus();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "We couldn't send your message. Please try again.");
      setStatus("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="message-center">
      <section className="message-context" aria-labelledby="message-context-title"><div><p className="eyebrow">Private correspondence</p><h2 id="message-context-title">A secure channel for this claim</h2></div><p>Messages are kept with your Claims Bridge claim. They are not a substitute for formal legal service or a guarantee of an outcome.</p></section>
      <section className="message-thread" aria-labelledby="message-thread-title"><div className="message-thread__heading"><div><p className="eyebrow">Claim correspondence</p><h2 id="message-thread-title">Conversation</h2></div><span>{conversationStatus === "OPEN" ? "Open" : "Closed"}</span></div>{nextCursor && <button className="button button--quiet button--medium message-thread__load" type="button" onClick={loadEarlier} disabled={loadingEarlier}>{loadingEarlier ? "Loading…" : "Load earlier messages"}</button>}{messages.length === 0 ? <p className="message-thread__empty">No messages have been sent yet. Use the secure composer below if you need to share an update about this claim.</p> : <ol className="message-list">{messages.map((message) => <li className={`message-item message-item--${message.senderType.toLowerCase()}`} key={message.id}><article><div className="message-item__heading"><span>{messageSenderLabels[message.senderType]}</span><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></div><p>{message.body}</p></article></li>)}</ol>}</section>
      {conversationStatus === "OPEN" ? <form className="message-composer" onSubmit={sendMessage}><label htmlFor="claim-message">Message to Claims Bridge</label><textarea ref={textareaRef} id="claim-message" name="body" value={body} maxLength={MAX_MESSAGE_LENGTH} onChange={(event) => setBody(event.target.value)} placeholder="Write your message…" aria-describedby="claim-message-help claim-message-status" disabled={sending} /><div className="message-composer__footer"><span id="claim-message-help">Plain text only · {body.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()}</span><button className="button button--primary button--medium" type="submit" disabled={sending || !body.trim()}><span className="button__label">{sending ? "Sending…" : "Send message"}</span></button></div><p className="message-composer__status" id="claim-message-status" role={error ? "alert" : "status"} aria-live="polite">{error || status}</p></form> : <section className="message-closed" aria-labelledby="message-closed-title"><p className="eyebrow">Correspondence closed</p><h2 id="message-closed-title">This conversation is read-only.</h2><p>New messages cannot be sent while this claim conversation is closed.</p></section>}
    </div>
  );
}
