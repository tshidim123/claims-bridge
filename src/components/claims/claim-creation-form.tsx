"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { startClaimFromAssessment, type CreateClaimActionState } from "@/app/account/assessment/actions";

const initialState: CreateClaimActionState = { ok: false };

export function ClaimCreationForm({ assessmentReference }: { assessmentReference: string }) {
  const [state, action, pending] = useActionState(startClaimFromAssessment, initialState);

  return (
    <form className="claim-creation" action={action} aria-describedby="claim-creation-note">
      <input type="hidden" name="assessmentReference" value={assessmentReference} />
      <div>
        <p className="eyebrow">Ready when you are</p>
        <h2>Continue to claim review</h2>
        <p id="claim-creation-note">This creates your Claims Bridge case record from the saved preliminary assessment. It does not guarantee a successful claim, and further assessment may be required.</p>
      </div>
      {state.message && <p className="claim-form-feedback" role="alert">{state.message}</p>}
      <Button type="submit" size="large" disabled={pending}>{pending ? "Starting…" : "Start my Claims Bridge claim"}</Button>
    </form>
  );
}
