"use client";

import { useState, useTransition } from "react";

import { retryCommunication } from "@/app/admin/communications-actions";

export function RetryCommunicationButton({
  emailReference,
}: {
  emailReference: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <button
        className="button button--small button--quiet"
        type="button"
        disabled={pending}
        aria-label={`Retry communication ${emailReference}`}
        onClick={() =>
          startTransition(async () => {
            const data = new FormData();
            data.set("emailReference", emailReference);
            try {
              await retryCommunication(data);
              setMessage("Retry requested.");
            } catch {
              setMessage("Retry could not be requested.");
            }
          })
        }
      >
        {pending ? "Requesting…" : "Retry"}
      </button>
      {message ? (
        <span role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
