import { applicationSchema } from "@/lib/validation";
import { allow, LIMITS } from "@/lib/ratelimit";
import type { Store } from "@/lib/store/types";

export type ApplyResult =
  | { ok: true }
  | { ok: false; error: "invalid"; fields: Record<string, string> }
  | { ok: false; error: "rate_limited" };

export interface ApplyContext {
  ip: string;
  now: Date;
  salt: string;
}

function fieldErrors(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] ??= issue.message;
  }
  return fields;
}

export async function submitApplication(
  store: Store,
  raw: unknown,
  ctx: ApplyContext
): Promise<ApplyResult> {
  if (!(await allow(store, LIMITS.apply, ctx.ip, ctx.now, ctx.salt))) {
    return { ok: false, error: "rate_limited" };
  }
  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid", fields: fieldErrors(parsed.error) };
  const data = parsed.data;
  if (data.website) return { ok: true };
  // A duplicate open application is reported as success so the form cannot probe for emails.
  await store.applications.insert({
    name: data.name,
    email: data.email,
    aeVersions: data.aeVersions,
    os: data.os,
    work: data.work,
    portfolioUrl: data.portfolioUrl,
    consentAt: ctx.now,
  });
  return { ok: true };
}
