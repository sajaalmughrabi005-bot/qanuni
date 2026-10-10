import { z } from "zod";

/** Validation only. There is deliberately no submission/persistence adapter. */
export const inquirySchema = z.object({
  company: z.string().trim().min(2).max(150),
  industry: z.string().trim().min(2).max(100),
  volume: z.enum(["1-10", "11-50", "51-200", "200+"]),
  categories: z.array(z.enum(["employment", "service", "commercial", "other"])).min(1).max(4),
  concern: z.string().trim().min(10).max(1000),
  service: z.enum(["assessment", "monitoring", "review"]),
  contact: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(30).refine(v => !v || /^[+\d ()-]{6,30}$/.test(v) && v.replace(/\D/g, "").length >= 6),
  preferredContact: z.enum(["email", "phone"]),
  demoConsent: z.literal(true),
}).superRefine((value, ctx) => {
  if (value.preferredContact === "phone" && !value.phone) ctx.addIssue({ code: "custom", path: ["phone"], message: "Phone required for phone contact" });
});
export type InquiryDraft = z.input<typeof inquirySchema>;

export function validateDemoInquiry(input: unknown): { status: "validated_locally" } | { status: "invalid"; fields: string[] } {
  const result = inquirySchema.safeParse(input);
  return result.success ? { status: "validated_locally" } : { status: "invalid", fields: [...new Set(result.error.issues.map(i => String(i.path[0])))] };
}
