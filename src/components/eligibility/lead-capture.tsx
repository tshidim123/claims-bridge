"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { captureEligibilityLead } from "@/lib/leads/actions";
import { createLeadAssociationKey } from "@/lib/leads/reference";
import type { AssessmentState } from "@/lib/eligibility/types";
import styles from "./eligibility.module.css";

const initial: { ok: boolean; message?: string; conversionToken?: string } = { ok: false };

export function LeadCapture({ assessment }: { assessment: AssessmentState }) {
  const [open, setOpen] = useState(false);
  const associationKey = useMemo(() => createLeadAssociationKey(), []);
  const [state, action, pending] = useActionState(captureEligibilityLead, initial);
  const router = useRouter();
  useEffect(() => { if (state.ok && state.conversionToken) router.push(`/sign-up?redirect_url=${encodeURIComponent(`/account/onboarding?lead=${state.conversionToken}`)}`); }, [state, router]);
  if (!open) return <button className={styles.saveResultLink} type="button" onClick={() => setOpen(true)}><span><strong>Save my result &amp; continue later</strong><small>Leave your details so you can return to this enquiry and create an account when ready.</small></span><Icon name="arrow" /></button>;
  return <div className={styles.leadCapture} aria-labelledby="lead-capture-title"><div><p className="eyebrow">Save your progress</p><h3 id="lead-capture-title">Keep this result available</h3><p>We will store the contact details you provide so Claims Bridge can follow up about this eligibility enquiry. This does not confirm legal eligibility or a claim outcome.</p></div><form action={action} noValidate><input type="hidden" name="assessment" value={JSON.stringify(assessment)} /><input type="hidden" name="associationKey" value={associationKey} /><label htmlFor="lead-first-name">First name<input id="lead-first-name" name="firstName" autoComplete="given-name" required /></label><label htmlFor="lead-email">Email address<input id="lead-email" name="email" type="email" autoComplete="email" required /></label><label htmlFor="lead-phone">Phone number <small>Optional</small><input id="lead-phone" name="phone" type="tel" autoComplete="tel" /></label><label htmlFor="lead-contact-method">Preferred contact method<select id="lead-contact-method" name="preferredContactMethod" defaultValue="email"><option value="email">Email</option><option value="phone">Phone</option></select></label><label className={styles.consentLabel}><input type="checkbox" name="serviceContactConsent" value="yes" required /> <span>I agree that Claims Bridge may contact me about this eligibility enquiry and next steps.</span></label><label className={styles.consentLabel}><input type="checkbox" name="marketingConsent" /> <span>It is okay to send me occasional Claims Bridge updates. Optional.</span></label><div className={styles.honeypot} aria-hidden="true"><label htmlFor="lead-website">Website<input id="lead-website" name="website" tabIndex={-1} autoComplete="off" /></label></div>{state.message && <p role={state.ok ? "status" : "alert"}>{state.message}</p>}<div className={styles.leadCaptureActions}><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save result"}</Button><Button type="button" variant="quiet" onClick={() => setOpen(false)}>Cancel</Button></div></form></div>;
}
