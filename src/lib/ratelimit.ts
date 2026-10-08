import { sha256Hex } from "@/lib/crypto";
import type { Store } from "@/lib/store/types";

export interface Limit {
  scope: string;
  windowSec: number;
  max: number;
}

export const LIMITS = {
  apply: { scope: "apply", windowSec: 3600, max: 5 },
  login: { scope: "login", windowSec: 900, max: 8 },
  deviceStart: { scope: "device-start", windowSec: 600, max: 10 },
  deviceToken: { scope: "device-token", windowSec: 60, max: 30 },
  licenseRefresh: { scope: "license-refresh", windowSec: 600, max: 30 },
  activate: { scope: "activate", windowSec: 600, max: 20 },
} as const satisfies Record<string, Limit>;

/** Subject (an IP or user id) is hashed with the scope; raw values are never stored. */
export async function allow(
  store: Store,
  limit: Limit,
  subject: string,
  now: Date,
  salt: string
): Promise<boolean> {
  const key = `${limit.scope}:${sha256Hex(`${salt}:${subject}`).slice(0, 32)}`;
  return store.rate.hit(key, limit.windowSec, limit.max, now);
}
