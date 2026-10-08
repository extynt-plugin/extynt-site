import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_RESEND_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(3),
  ADMIN_EMAILS: z.string().default(""),
  BETA_ENDS_AT: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "BETA_ENDS_AT must be an ISO date"),
  LICENSE_SIGNING_KEY: z.string().min(1),
  SITE_URL: z.string().url().default("https://extynt.com"),
});

export interface AppEnv {
  databaseUrl: string;
  authSecret: string;
  resendKey: string;
  emailFrom: string;
  adminEmails: string[];
  betaEndsAt: Date;
  signingKey: string;
  siteUrl: string;
}

export function parseAdminEmails(raw: string): string[] {
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

function loadEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const e = schema.parse(source);
  return {
    databaseUrl: e.DATABASE_URL,
    authSecret: e.AUTH_SECRET,
    resendKey: e.AUTH_RESEND_KEY,
    emailFrom: e.EMAIL_FROM,
    adminEmails: parseAdminEmails(e.ADMIN_EMAILS),
    betaEndsAt: new Date(e.BETA_ENDS_AT),
    signingKey: e.LICENSE_SIGNING_KEY.replace(/\\n/g, "\n"),
    siteUrl: e.SITE_URL.replace(/\/$/, ""),
  };
}

let cached: AppEnv | undefined;

export function getEnv(): AppEnv {
  cached ??= loadEnv();
  return cached;
}
