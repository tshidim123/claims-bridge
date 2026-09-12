"use client";

import { useState } from "react";
import { isolatedPreviewHtml } from "@/lib/communications/preview";
import styles from "./preview.module.css";

export function EmailPreview({ html, text }: { html: string; text: string }) {
  const [width, setWidth] = useState<390 | 600>(600);
  const [plainText, setPlainText] = useState(false);
  const [imagesOff, setImagesOff] = useState(false);
  return (
    <section aria-label="Rendered email">
      <div className={styles.modes}>
        <div role="group" aria-label="Email viewport">
          <button
            type="button"
            aria-pressed={!plainText && width === 600}
            onClick={() => {
              setWidth(600);
              setPlainText(false);
            }}
          >
            Desktop · 600px
          </button>
          <button
            type="button"
            aria-pressed={!plainText && width === 390}
            onClick={() => {
              setWidth(390);
              setPlainText(false);
            }}
          >
            Mobile · 390px
          </button>
          <button
            type="button"
            aria-pressed={plainText}
            onClick={() => setPlainText(true)}
          >
            Plain text
          </button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={imagesOff}
            onChange={(event) => setImagesOff(event.target.checked)}
          />{" "}
          Block images
        </label>
      </div>
      <p className={styles.note}>
        The live-text brand, reference and next steps remain readable with
        images blocked. Preview links are contained in a sandboxed frame.
      </p>
      {plainText ? (
        <pre className={styles.plainText} aria-label="Plain-text email">
          {text}
        </pre>
      ) : (
        <div className={styles.canvas}>
          <iframe
            key={`${width}-${imagesOff}`}
            title={`${width}px Claims Bridge email preview${imagesOff ? ", images blocked" : ""}`}
            sandbox=""
            referrerPolicy="no-referrer"
            srcDoc={isolatedPreviewHtml(html, imagesOff)}
            width={width}
            height={1100}
          />
        </div>
      )}
    </section>
  );
}
