"use server";
import { createDurableLead } from "./service";
export async function captureEligibilityLead(_previous: { ok: boolean; message?: string; conversionToken?: string }, formData: FormData) {
  try { const assessment = JSON.parse(String(formData.get("assessment") ?? "")); const result = await createDurableLead({ firstName: formData.get("firstName"), email: formData.get("email"), phone: formData.get("phone"), preferredContactMethod: formData.get("preferredContactMethod"), serviceContactConsent: formData.get("serviceContactConsent"), marketingConsent: formData.get("marketingConsent") === "on", associationKey: formData.get("associationKey"), assessment, honeypot: formData.get("website") }); return { ok: true, conversionToken: result.conversionToken, message: "Your result is saved. Continue to create or access your account." }; }
  catch (error) { return { ok: false, message: error instanceof Error && error.message.includes("contact") ? error.message : "We could not save your result. Check the details and try again." }; }
}
