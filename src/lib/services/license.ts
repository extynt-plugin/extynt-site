import { evaluateAccess, type AccessDenial } from "@/lib/access";
import { issueLicense, type IssuedLicense, type LicenseCfg } from "@/lib/license/issue";
import { publicKeyOf, verifyLicense } from "@/lib/license/token";
import type { Store } from "@/lib/store/types";

export type RefreshResult =
  | { ok: true; license: IssuedLicense }
  | { ok: false; error: "invalid_token" | "token_expired" | "device_revoked" }
  | { ok: false; error: "access_ended"; reason: AccessDenial };

export async function refreshLicense(
  store: Store,
  token: string,
  cfg: LicenseCfg,
  now: Date
): Promise<RefreshResult> {
  const verified = verifyLicense(
    token,
    publicKeyOf(cfg.signingKey),
    Math.floor(now.getTime() / 1000)
  );
  if (!verified.ok) {
    return { ok: false, error: verified.reason === "expired" ? "token_expired" : "invalid_token" };
  }
  const { sub, did, email } = verified.claims;
  const device = await store.devices.get(did);
  if (!device || device.userId !== sub) return { ok: false, error: "invalid_token" };
  if (device.revokedAt) return { ok: false, error: "device_revoked" };
  const access = evaluateAccess(await store.testers.byEmail(email), now, cfg.betaEndsAt);
  if (!access.ok) return { ok: false, error: "access_ended", reason: access.reason };
  const license = issueLicense(
    { user: { id: sub, email }, deviceId: did, tester: access.tester, now },
    cfg
  );
  if (!license) return { ok: false, error: "access_ended", reason: "expired" };
  await store.devices.touch(did, now);
  return { ok: true, license };
}
