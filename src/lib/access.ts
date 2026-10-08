import type { TesterRow } from "@/lib/store/types";

export type AccessDenial = "no_tester" | "revoked" | "expired" | "beta_ended";

export type AccessResult = { ok: true; tester: TesterRow } | { ok: false; reason: AccessDenial };

export function evaluateAccess(
  tester: TesterRow | null,
  now: Date,
  betaEndsAt: Date
): AccessResult {
  if (!tester) return { ok: false, reason: "no_tester" };
  if (tester.status !== "active") return { ok: false, reason: "revoked" };
  if (now >= betaEndsAt) return { ok: false, reason: "beta_ended" };
  if (tester.accessUntil && now >= tester.accessUntil) return { ok: false, reason: "expired" };
  return { ok: true, tester };
}
