import { z } from "zod";

const compact = (maximum: number, label: string) => z.string().max(maximum, `${label} is too long.`).transform((value) => value.trim().replace(/\s+/g, " "));
const requiredText = (maximum: number, label: string, message: string) => z.string().min(1, message).max(maximum, `${label} is too long.`).transform((value) => value.trim().replace(/\s+/g, " "));
const optionalText = (maximum: number, label: string) => compact(maximum, label).optional().or(z.literal(""));

export const contactMethods = ["email", "phone", "whatsapp", "no_preference"] as const;
export const contactTimes = ["morning", "afternoon", "evening", "anytime", "custom"] as const;
export const profileShareFields = ["avatar", "first_name", "last_name", "bio", "phone", "city_region"] as const;

export function normalisePhone(value: string) {
  const compactValue = value.trim().replace(/[\s().-]/g, "");
  if (compactValue.startsWith("0044")) return `+44${compactValue.slice(4)}`;
  if (compactValue.startsWith("0")) return `+44${compactValue.slice(1)}`;
  return compactValue;
}

const phone = z.string().transform(normalisePhone).refine((value) => !value || /^\+[1-9]\d{6,14}$/.test(value), "Enter a valid phone number.").optional().or(z.literal(""));

export const profileSchema = z.object({
  firstName: requiredText(80, "First name", "Enter your first name."),
  lastName: requiredText(80, "Surname", "Enter your surname."),
  phone,
  bio: optionalText(500, "Bio").refine((value: string | undefined) => !value || !/[<>]/.test(value), "Bio must be plain text."),
  addressLine1: optionalText(120, "Address line 1"),
  addressLine2: optionalText(120, "Address line 2"),
  city: optionalText(100, "Town or city"),
  region: optionalText(100, "County or region"),
  postcode: optionalText(20, "Postcode").refine((value: string | undefined) => !value || /^[A-Za-z0-9][A-Za-z0-9\s-]{1,18}$/.test(value), "Enter a valid postcode."),
  country: requiredText(80, "Country", "Enter a country."),
  preferredContactMethod: z.enum(contactMethods),
  preferredContactTime: z.enum(contactTimes),
  preferredContactTimeNote: optionalText(120, "Contact time note"),
}).superRefine((value, ctx) => {
  if ((value.preferredContactMethod === "phone" || value.preferredContactMethod === "whatsapp") && !value.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a phone number for this contact preference." });
  if (value.preferredContactTime === "custom" && !value.preferredContactTimeNote) ctx.addIssue({ code: "custom", path: ["preferredContactTimeNote"], message: "Add a short contact-time preference." });
});

export const onboardingSchema = profileSchema;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export const profileShareSchema = z.object({ selectedFields: z.array(z.enum(profileShareFields)).min(1, "Choose at least one profile field."), duration: z.enum(["1h", "24h", "7d"]) });
export type ProfileShareInput = z.infer<typeof profileShareSchema>;
