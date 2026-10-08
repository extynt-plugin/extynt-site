import { evaluateAccess } from "@/lib/access";
import { isAdminEmail } from "@/lib/admin";
import type { Store } from "@/lib/store/types";

/** Gate for sending and honouring magic links: admins, or testers with live access. */
export async function canSignIn(
  store: Store,
  email: string,
  cfg: { adminEmails: string[]; betaEndsAt: Date },
  now: Date
): Promise<boolean> {
  if (isAdminEmail(email, cfg.adminEmails)) return true;
  const tester = await store.testers.byEmail(email.trim().toLowerCase());
  return evaluateAccess(tester, now, cfg.betaEndsAt).ok;
}
