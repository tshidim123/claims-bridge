"use client";

import { useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";

import styles from "./shipment-continuation.module.css";

export function CopyTrackingCode({ trackingCode }: { trackingCode: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">("idle");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(trackingCode);
      setCopyState("copied");
    } catch {
      setCopyState("unavailable");
    }
  }

  return (
    <>
      <button className={styles.copyButton} type="button" onClick={copyCode}>
        {copyState === "copied" ? "Copied" : "Copy code"}
      </button>
      <span className={copyState === "unavailable" ? styles.copyMessage : styles.visuallyHidden} role="status">
        {copyState === "copied" && "Tracking code copied."}
        {copyState === "unavailable" && "Select the tracking code to copy it."}
      </span>
    </>
  );
}

export function CheckoutPreview({ fee }: { fee: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button className={styles.confirmButton} type="button" onClick={() => dialog.current?.showModal()}>
        <Icon name="shield" /> Pay now — {fee}
      </button>
      <dialog ref={dialog} className={styles.checkoutDialog} aria-labelledby="checkout-preview-title" aria-describedby="checkout-preview-description">
        <h2 id="checkout-preview-title">Checkout preview complete</h2>
        <p id="checkout-preview-description">You’ve completed the preview for the {fee} sample shipping fee.</p>
        <form method="dialog">
          <button className={styles.confirmButton} type="submit">Back to checkout</button>
        </form>
      </dialog>
    </>
  );
}
