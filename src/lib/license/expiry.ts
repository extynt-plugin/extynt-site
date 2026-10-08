export const LICENSE_TTL_SEC = 7 * 24 * 60 * 60;

export interface ExpiryInput {
  nowSec: number;
  accessUntil: Date | null;
  betaEndsAt: Date;
}

/** exp = min(now + 7 days, access_until, BETA_ENDS_AT); null when that is not in the future. */
export function computeExpiry(input: ExpiryInput): number | null {
  const limits = [input.nowSec + LICENSE_TTL_SEC, Math.floor(input.betaEndsAt.getTime() / 1000)];
  if (input.accessUntil) limits.push(Math.floor(input.accessUntil.getTime() / 1000));
  const exp = Math.min(...limits);
  return exp > input.nowSec ? exp : null;
}
