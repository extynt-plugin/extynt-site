import { z } from "zod";

export const AE_VERSIONS = ["AE 25", "AE 26", "Other / not sure"] as const;
export const OPERATING_SYSTEMS = ["macOS", "Windows"] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const applicationSchema = z.object({
  name: text(120),
  email: z.string().trim().toLowerCase().email().max(254),
  aeVersions: z.array(z.enum(AE_VERSIONS)).min(1).max(AE_VERSIONS.length),
  os: z.enum(OPERATING_SYSTEMS),
  work: text(1000),
  portfolioUrl: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || (/^https?:\/\//i.test(v) && URL.canParse(v)),
      "Use a full http(s) link"
    )
    .optional()
    .transform((v) => (v ? v : null)),
  consent: z.literal(true),
  // Honeypot: real people never see or fill this field.
  website: z.string().max(500).optional(),
});

export const emailSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });

export const deviceStartSchema = z.object({
  machine_id: z.string().regex(/^[0-9a-f]{64}$/, "machine_id must be 64 lowercase hex chars"),
  device_name: z.string().trim().min(1).max(80).optional(),
  platform: z.string().trim().max(40).optional(),
  app_version: z.string().trim().max(40).optional(),
});

export const deviceTokenSchema = z.object({ device_code: z.string().min(16).max(128) });

export const userCodeSchema = z.object({ code: z.string().trim().min(1).max(20) });

export const uuidSchema = z.string().uuid();

export const extendSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  until: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date")
    .transform((v) => new Date(v)),
});
