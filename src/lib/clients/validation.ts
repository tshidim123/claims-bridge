import { z } from "zod";
export const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(80, "First name is too long."),
  lastName: z.string().trim().min(1, "Enter your last name.").max(80, "Last name is too long."),
  phone: z.string().trim().max(40, "Phone number is too long.").optional().or(z.literal("")),
  preferredContactMethod: z.enum(["email", "phone"]),
}).superRefine((value, ctx) => { if (value.preferredContactMethod === "phone" && !value.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a phone number when phone contact is selected." }); if (value.phone && !/^[+\d][\d\s().-]{5,38}$/.test(value.phone)) ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid phone number." }); });
export type OnboardingInput = z.infer<typeof onboardingSchema>;
