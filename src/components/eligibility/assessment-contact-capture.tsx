"use client";

import { useActionState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { savePreAccountAssessment } from "@/lib/leads/pre-account-actions";
import { createLeadAssociationKey } from "@/lib/leads/association-key";
import type { AssessmentState } from "@/lib/eligibility/types";
import styles from "./eligibility.module.css";

const initial: { ok: boolean; message?: string; assessmentReference?: string; conversionToken?: string } = { ok: false };
export function AssessmentContactCapture({ assessment, onSaved, onBack }: { assessment: AssessmentState; onSaved: (reference: string, conversionToken: string) => void; onBack: () => void }) {
  const [state, action, pending] = useActionState(savePreAccountAssessment, initial);
  const associationKey = useMemo(() => createLeadAssociationKey(), []);
  useEffect(() => { if (state.ok && state.assessmentReference && state.conversionToken) onSaved(state.assessmentReference, state.conversionToken); }, [onSaved, state]);
  return <section className={styles.contactCapture} aria-labelledby="contact-capture-title"><div className={styles.contactCaptureIntro}><p className="eyebrow">Your assessment is ready</p><h2 id="contact-capture-title">Save your eligibility assessment</h2><p>Enter your contact details so Claims Bridge can securely save this assessment and help you continue your enquiry.</p><p className={styles.contactPrivacy}><Icon name="shield" />Your details are contact information for this enquiry. Email and phone are not shown as verified until an account provider verifies them.</p></div><form className={styles.contactCaptureForm} action={action} noValidate><input type="hidden" name="assessment" value={JSON.stringify(assessment)} /><input type="hidden" name="associationKey" value={associationKey} /><label htmlFor="assessment-first-name">First name<input id="assessment-first-name" name="firstName" autoComplete="given-name" required /></label><label htmlFor="assessment-email">Email address<input id="assessment-email" name="email" type="email" autoComplete="email" required /></label><label htmlFor="assessment-phone">Phone number<input id="assessment-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required /></label><label className={styles.consentLabel}><input type="checkbox" name="serviceContactConsent" value="yes" required /><span>I agree that Claims Bridge may use these details to save and follow up on this eligibility enquiry.</span></label><label className={styles.consentLabel}><input type="checkbox" name="marketingConsent" /><span>It is okay to send me occasional Claims Bridge updates. Optional.</span></label><div className={styles.honeypot} aria-hidden="true"><label htmlFor="assessment-website">Website<input id="assessment-website" name="website" tabIndex={-1} autoComplete="off" /></label></div>{state.message && <p role="alert">{state.message}</p>}<div className={styles.contactCaptureActions}><Button type="submit" size="large" disabled={pending}>{pending ? "Saving assessment…" : "Save assessment & view my result"} <Icon name="arrow" /></Button><Button type="button" variant="quiet" onClick={onBack}>Review answers</Button></div><p className={styles.signInPrompt}>Already have an account? <Link href="/sign-in">Sign in</Link></p></form></section>;
}
