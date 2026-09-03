import { z } from "zod";

import { assessmentPayloadSchema } from "@/lib/eligibility/persistence/validation";
import { normalisePhone } from "@/lib/clients/validation";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254, "Email address is too long.");
const phone = z.string().trim().max(40, "Phone number is too long.").transform(normalisePhone).refine((value) => !value || /^\+[1-9]\d{6,14}$/.test(value), "Enter a valid phone number.");
export const leadContactMethods = ["email", "call", "sms", "whatsapp"] as const;
export type LeadContactMethod = (typeof leadContactMethods)[number];
export const leadContactMethodLabels: Record<LeadContactMethod, string> = { email: "Email", call: "Call", sms: "Messages", whatsapp: "WhatsApp" };
export const leadContactMethodHelperText: Record<LeadContactMethod, string> = {
  email: "We’ll use this email for updates about your assessment.",
  call: "We’ll use this number if we need to contact you about your assessment.",
  sms: "We’ll use this number for text-message contact about your assessment.",
  whatsapp: "We’ll use this number for WhatsApp contact about your assessment.",
};
const optionalPhone = z.string().trim().max(40, "Phone number is too long.").transform(normalisePhone).refine((value) => !value || /^\+[1-9]\d{6,14}$/.test(value), "Enter a valid phone number.");
const addLeadContactPreferenceIssues = (value: { preferredContactMethod?: LeadContactMethod; email?: string; phone?: string }, ctx: z.RefinementCtx) => {
  if (!value.preferredContactMethod) { ctx.addIssue({ code: "custom", path: ["preferredContactMethod"], message: "Choose how you would prefer Claims Bridge to contact you." }); return; }
  if (!value.email) ctx.addIssue({ code: "custom", path: ["email"], message: "Enter an email address so we can send your assessment confirmation and secure next steps." });
  if (value.preferredContactMethod !== "email" && !value.phone) {
    const method = value.preferredContactMethod === "whatsapp" ? "WhatsApp" : value.preferredContactMethod === "sms" ? "message" : "call";
    ctx.addIssue({ code: "custom", path: ["phone"], message: `Enter a phone number so we can contact you by ${method}.` });
  }
};
export const preAccountContactSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80, "First name is too long."),
  lastName: z.string().trim().min(1, "Enter your surname.").max(80, "Surname is too long."),
  preferredContactMethod: z.enum(leadContactMethods, { error: "Choose how you would prefer Claims Bridge to contact you." }),
  email,
  phone: optionalPhone,
}).superRefine(addLeadContactPreferenceIssues);

export const leadCaptureSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80, "First name is too long."),
  email,
  phone: phone.optional().or(z.literal("")),
  preferredContactMethod: z.enum(["email", "phone"]),
  serviceContactConsent: z.literal("yes", { error: "Please confirm that Claims Bridge may contact me about this enquiry." }),
  marketingConsent: z.coerce.boolean().default(false),
  associationKey: z.string().regex(/^[A-Za-z0-9_-]{24,48}$/, "This capture session is invalid."),
  assessment: assessmentPayloadSchema,
  honeypot: z.string().max(0).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.preferredContactMethod === "phone" && !value.phone) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a phone number when phone contact is selected." });
  }
});
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;

export const preAccountAssessmentCaptureSchema = preAccountContactSchema.extend({
  serviceContactConsent: z.literal("yes", { error: "Please confirm that Claims Bridge may contact me about this enquiry." }),
  marketingConsent: z.coerce.boolean().default(false),
  associationKey: z.string().regex(/^[A-Za-z0-9_-]{24,48}$/, "This capture session is invalid."),
  assessment: assessmentPayloadSchema,
  honeypot: z.string().max(0).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  addLeadContactPreferenceIssues(value, ctx);
  if (value.assessment.status !== "complete") {
    ctx.addIssue({ code: "custom", path: ["assessment", "status"], message: "Complete the assessment before saving it." });
  }
});
export type PreAccountAssessmentCaptureInput = z.infer<typeof preAccountAssessmentCaptureSchema>;

export const leadStatusChangeSchema = z.object({ leadReference: z.string().regex(/^CB-LEAD-[0-9A-F]{8}$/), status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "CLOSED"]) });
export const leadNoteSchema = z.object({ leadReference: z.string().regex(/^CB-LEAD-[0-9A-F]{8}$/), body: z.string().trim().min(1, "Enter a note.").max(2000, "Keep notes under 2,000 characters.") });
