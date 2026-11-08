"use client";

import { useState } from "react";

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
