import { describe, expect, it } from "vitest";
import { LICENSE_TTL_SEC } from "@/lib/license/expiry";
import { signLicense } from "@/lib/license/token";
import { decideDevice, pollDevice, startDevice } from "@/lib/services/device";
import { refreshLicense } from "@/lib/services/license";
import { MACHINE_ID, NOW, setup } from "./helpers/fixtures";

const viewer = { id: "user-1", email: "tess@example.com" };
const later = (sec: number) => new Date(NOW.getTime() + sec * 1000);

async function signedIn(over: Parameters<typeof setup>[0] = {}) {
  const ctx = setup(over);
  const start = await startDevice(ctx.store, { machine_id: MACHINE_ID }, "https://extynt.com", NOW);
  await decideDevice(ctx.store, viewer, { rawCode: start.user_code, approve: true }, ctx.cfg, NOW);
  const polled = await pollDevice(ctx.store, start.device_code, ctx.cfg, later(10));
  if (polled.state !== "issued") throw new Error("expected license");
  return { ...ctx, token: polled.license.token, exp: polled.license.expiresAt };
}

describe("license refresh", () => {
  it("issues a fresh token for an active tester", async () => {
    const { store, cfg, token } = await signedIn();
    const r = await refreshLicense(store, token, cfg, later(3600));
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.license.expiresAt).toBe(Math.floor(later(3600).getTime() / 1000) + LICENSE_TTL_SEC);
  });

  it("clamps to access_until and the beta end", async () => {
    const { store, cfg, token, state } = await signedIn();
    const until = new Date(NOW.getTime() + 2 * 86400_000);
    state.testers[0]!.accessUntil = until;
    const r = await refreshLicense(store, token, cfg, later(60));
    expect(r.ok && r.license.expiresAt).toBe(Math.floor(until.getTime() / 1000));
  });

  it("refuses after the tester is revoked", async () => {
    const { store, cfg, token } = await signedIn();
    await store.testers.setStatus(viewer.email, "revoked");
    expect(await refreshLicense(store, token, cfg, later(60))).toMatchObject({
      error: "access_ended",
      reason: "revoked",
    });
  });

  it("refuses after the device is revoked", async () => {
    const { store, cfg, token, state } = await signedIn();
    await store.devices.revoke(state.devices[0]!.id, later(30));
    expect(await refreshLicense(store, token, cfg, later(60))).toEqual({
      ok: false,
      error: "device_revoked",
    });
  });

  it("refuses after the global beta end", async () => {
    const { store, cfg, token } = await signedIn({
      betaEndsAt: new Date(NOW.getTime() + 3600_000),
    });
    const r = await refreshLicense(store, token, cfg, later(3700));
    expect(r.ok).toBe(false);
  });

  it("refuses expired, forged and mismatched tokens", async () => {
    const { store, cfg, token, exp } = await signedIn();
    expect(await refreshLicense(store, token, cfg, new Date((exp + 1) * 1000))).toEqual({
      ok: false,
      error: "token_expired",
    });
    expect(await refreshLicense(store, "junk", cfg, NOW)).toEqual({
      ok: false,
      error: "invalid_token",
    });
    const ghost = signLicense(
      {
        iss: "extynt.com",
        sub: "user-1",
        email: viewer.email,
        did: "missing",
        iat: 1,
        exp: 4102444800,
        plan: "beta",
      },
      cfg.signingKey
    );
    expect(await refreshLicense(store, ghost, cfg, NOW)).toEqual({
      ok: false,
      error: "invalid_token",
    });
  });
});
