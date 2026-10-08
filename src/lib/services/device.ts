import {
  generateUserCode,
  isValidUserCode,
  normalizeUserCode,
  randomSecret,
  sha256Hex,
} from "@/lib/crypto";
import { evaluateAccess, type AccessDenial } from "@/lib/access";
import { issueLicense, type IssuedLicense, type LicenseCfg } from "@/lib/license/issue";
import type { DeviceCodeRow, Store } from "@/lib/store/types";

export const CODE_TTL_SEC = 600;
export const POLL_INTERVAL_SEC = 5;
const SLOW_DOWN_STEP_SEC = 5;

export interface StartInput {
  machine_id: string;
  device_name?: string;
  platform?: string;
  app_version?: string;
}

export interface StartResult {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
  expires_in: number;
}

export async function startDevice(
  store: Store,
  input: StartInput,
  siteUrl: string,
  now: Date
): Promise<StartResult> {
  const deviceCode = randomSecret(32);
  const userCode = generateUserCode();
  await store.codes.create({
    deviceCodeHash: sha256Hex(deviceCode),
    userCodeHash: sha256Hex(userCode),
    expiresAt: new Date(now.getTime() + CODE_TTL_SEC * 1000),
    intervalSec: POLL_INTERVAL_SEC,
    deviceName: input.device_name ?? null,
    platform: input.platform ?? null,
    appVersion: input.app_version ?? null,
    machineIdHash: input.machine_id,
  });
  return {
    device_code: deviceCode,
    user_code: userCode,
    verification_uri: `${siteUrl}/activate`,
    interval: POLL_INTERVAL_SEC,
    expires_in: CODE_TTL_SEC,
  };
}

export type PollResult =
  | { state: "issued"; license: IssuedLicense }
  | { state: "authorization_pending" }
  | { state: "slow_down"; interval: number }
  | { state: "expired_token" }
  | { state: "access_denied"; reason?: AccessDenial }
  | { state: "invalid_device_code" };

type Terminal = Extract<PollResult, { state: "expired_token" | "access_denied" }>;

function terminalState(row: DeviceCodeRow, now: Date): Terminal | null {
  if (row.deniedAt) return { state: "access_denied" };
  if (row.consumedAt || row.expiresAt <= now) return { state: "expired_token" };
  return null;
}

async function pendingState(store: Store, row: DeviceCodeRow, now: Date): Promise<PollResult> {
  const tooSoon =
    row.lastPolledAt && now.getTime() - row.lastPolledAt.getTime() < row.intervalSec * 1000;
  if (tooSoon) {
    const interval = row.intervalSec + SLOW_DOWN_STEP_SEC;
    await store.codes.touchPoll(row.id, now, interval);
    return { state: "slow_down", interval };
  }
  await store.codes.touchPoll(row.id, now, row.intervalSec);
  return { state: "authorization_pending" };
}

async function issueApproved(
  store: Store,
  row: DeviceCodeRow & { approvedUserId: string; deviceId: string },
  cfg: LicenseCfg,
  now: Date
): Promise<PollResult> {
  const user = await store.users.byId(row.approvedUserId);
  const access = evaluateAccess(
    user ? await store.testers.byEmail(user.email) : null,
    now,
    cfg.betaEndsAt
  );
  if (!user || !access.ok)
    return { state: "access_denied", reason: access.ok ? undefined : access.reason };
  const license = issueLicense({ user, deviceId: row.deviceId, tester: access.tester, now }, cfg);
  if (!license) return { state: "access_denied", reason: "expired" };
  if (!(await store.codes.consume(row.id, now))) return { state: "expired_token" };
  await store.devices.touch(row.deviceId, now);
  return { state: "issued", license };
}

export async function pollDevice(
  store: Store,
  deviceCode: string,
  cfg: LicenseCfg,
  now: Date
): Promise<PollResult> {
  const row = await store.codes.byDeviceHash(sha256Hex(deviceCode));
  if (!row) return { state: "invalid_device_code" };
  const terminal = terminalState(row, now);
  if (terminal) return terminal;
  const { approvedAt, approvedUserId, deviceId } = row;
  if (!approvedAt || !approvedUserId || !deviceId) return pendingState(store, row, now);
  return issueApproved(store, { ...row, approvedUserId, deviceId }, cfg, now);
}

export interface Viewer {
  id: string;
  email: string;
}

export type LookupResult =
  | { ok: true; code: DeviceCodeRow }
  | { ok: false; error: "invalid_code" | "expired" | "already_used" | "no_access" };

async function requireActiveTester(store: Store, viewer: Viewer, cfg: LicenseCfg, now: Date) {
  return evaluateAccess(await store.testers.byEmail(viewer.email), now, cfg.betaEndsAt).ok;
}

export async function lookupUserCode(
  store: Store,
  viewer: Viewer,
  rawCode: string,
  cfg: LicenseCfg,
  now: Date
): Promise<LookupResult> {
  if (!(await requireActiveTester(store, viewer, cfg, now)))
    return { ok: false, error: "no_access" };
  const code = normalizeUserCode(rawCode);
  if (!isValidUserCode(code)) return { ok: false, error: "invalid_code" };
  const row = await store.codes.byUserHash(sha256Hex(code));
  if (!row) return { ok: false, error: "invalid_code" };
  if (row.expiresAt <= now) return { ok: false, error: "expired" };
  if (row.approvedAt || row.deniedAt || row.consumedAt) return { ok: false, error: "already_used" };
  return { ok: true, code: row };
}

export async function decideDevice(
  store: Store,
  viewer: Viewer,
  decision: { rawCode: string; approve: boolean },
  cfg: LicenseCfg,
  now: Date
): Promise<LookupResult> {
  const found = await lookupUserCode(store, viewer, decision.rawCode, cfg, now);
  if (!found.ok) return found;
  const row = found.code;
  const done = decision.approve
    ? await store.codes.approve(
        row.id,
        viewer.id,
        {
          name: row.deviceName ?? "Unnamed device",
          platform: row.platform,
          appVersion: row.appVersion,
          machineIdHash: row.machineIdHash,
        },
        now
      )
    : await store.codes.deny(row.id, now);
  return done ? found : { ok: false, error: "already_used" };
}
