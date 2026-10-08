import { computeExpiry } from "./expiry";
import { signLicense, type LicensePlan } from "./token";
import type { TesterRow } from "@/lib/store/types";

export interface LicenseCfg {
  signingKey: string;
  betaEndsAt: Date;
}

export interface IssueInput {
  user: { id: string; email: string };
  deviceId: string;
  tester: TesterRow;
  now: Date;
  plan?: LicensePlan;
}

export interface IssuedLicense {
  token: string;
  expiresAt: number;
}

/** Null when the clamped expiry is not in the future (access has effectively ended). */
export function issueLicense(input: IssueInput, cfg: LicenseCfg): IssuedLicense | null {
  const iat = Math.floor(input.now.getTime() / 1000);
  const exp = computeExpiry({
    nowSec: iat,
    accessUntil: input.tester.accessUntil,
    betaEndsAt: cfg.betaEndsAt,
  });
  if (exp === null) return null;
  const token = signLicense(
    {
      iss: "extynt.com",
      sub: input.user.id,
      email: input.user.email,
      did: input.deviceId,
      iat,
      exp,
      plan: input.plan ?? "beta",
    },
    cfg.signingKey
  );
  return { token, expiresAt: exp };
}
