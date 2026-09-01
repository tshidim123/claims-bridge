import { z } from "zod";

import { assessmentPayloadSchema } from "@/lib/eligibility/persistence/validation";
import { normalisePhone } from "@/lib/clients/validation";

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254, "Email address is too long.");
const phone = z.string().trim().max(40, "Phone number is too long.").transform(normalisePhone).refine((value) => !value || /^\+[1-9]\d{6,14}$/.test(value), "Enter a valid phone number.");
const requiredPhone = phone.refine((value) => Boolean(value), "Enter a phone number.");

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

export const preAccountAssessmentCaptureSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80, "First name is too long."),
  email,
  phone: requiredPhone,
  serviceContactConsent: z.literal("yes", { error: "Please confirm that Claims Bridge may contact me about this enquiry." }),
  marketingConsent: z.coerce.boolean().default(false),
  associationKey: z.string().regex(/^[A-Za-z0-9_-]{24,48}$/, "This capture session is invalid."),
  assessment: assessmentPayloadSchema,
  honeypot: z.string().max(0).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.assessment.status !== "complete") {
    ctx.addIssue({ code: "custom", path: ["assessment", "status"], message: "Complete the assessment before saving it." });
  }
});
export type PreAccountAssessmentCaptureInput = z.infer<typeof preAccountAssessmentCaptureSchema>;

export const leadStatusChangeSchema = z.object({ leadReference: z.string().regex(/^CB-LEAD-[0-9A-F]{8}$/), status: z.enum(["NEW", "CONTACTED", "FOLLOW_UP", "CLOSED"]) });
export const leadNoteSchema = z.object({ leadReference: z.string().regex(/^CB-LEAD-[0-9A-F]{8}$/), body: z.string().trim().min(1, "Enter a note.").max(2000, "Keep notes under 2,000 characters.") });
