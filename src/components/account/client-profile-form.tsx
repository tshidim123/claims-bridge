"use client";

import { useActionState } from "react";

import { updateClientProfile, type ClientProfileActionState } from "@/app/account/profile/actions";
import { Button } from "@/components/ui/button";

const initialState: ClientProfileActionState = { ok: false };

export function ClientProfileForm({ profile }: { profile: { firstName: string; lastName: string; phone: string | null; preferredContactMethod: "email" | "phone" } }) {
  const [state, action, pending] = useActionState(updateClientProfile, initialState);
  return <form action={action} className="account-profile-form" noValidate aria-describedby="profile-help">
    <label htmlFor="profile-first-name">First name<input id="profile-first-name" name="firstName" autoComplete="given-name" defaultValue={profile.firstName} aria-invalid={Boolean(state.fieldErrors?.firstName)} />{state.fieldErrors?.firstName && <span role="alert">{state.fieldErrors.firstName}</span>}</label>
    <label htmlFor="profile-last-name">Last name<input id="profile-last-name" name="lastName" autoComplete="family-name" defaultValue={profile.lastName} aria-invalid={Boolean(state.fieldErrors?.lastName)} />{state.fieldErrors?.lastName && <span role="alert">{state.fieldErrors.lastName}</span>}</label>
    <label htmlFor="profile-phone">Phone number <small>Optional unless phone contact is selected</small><input id="profile-phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile.phone ?? ""} aria-invalid={Boolean(state.fieldErrors?.phone)} />{state.fieldErrors?.phone && <span role="alert">{state.fieldErrors.phone}</span>}</label>
    <label htmlFor="profile-contact-method">Preferred contact method<select id="profile-contact-method" name="preferredContactMethod" defaultValue={profile.preferredContactMethod}><option value="email">Email</option><option value="phone">Phone</option></select></label>
    <p id="profile-help">Your sign-in email is managed by Clerk and cannot be changed in this client profile.</p>
    {state.message && <p className="account-profile-form__feedback" role={state.ok ? "status" : "alert"}>{state.message}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile changes"}</Button>
  </form>;
}
