"use server";

import { createPreAccountAssessment } from "./service";

export async function savePreAccountAssessment(_previous: { ok: boolean; message?: string; assessmentReference?: string; conversionToken?: string }, formData: FormData) {
  try {
    const assessment = JSON.parse(String(formData.get("assessment") ?? ""));
    const result = await createPreAccountAssessment({ firstName: formData.get("firstName"), lastName: formData.get("lastName"), preferredContactMethod: formData.get("preferredContactMethod"), email: formData.get("email"), phone: formData.get("phone"), serviceContactConsent: formData.get("serviceContactConsent"), marketingConsent: formData.get("marketingConsent") === "on", associationKey: formData.get("associationKey"), assessment, honeypot: formData.get("website") });
    return { ok: true, assessmentReference: result.assessmentReference, conversionToken: result.conversionToken, message: "Assessment saved." };
  } catch (error) { return { ok: false, message: error instanceof Error ? error.message : "We could not save this assessment. Please try again." }; }
}
