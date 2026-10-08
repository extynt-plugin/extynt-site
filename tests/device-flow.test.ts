import { describe, expect, it } from "vitest";
import {
  generateUserCode,
  isValidUserCode,
  USER_CODE_ALPHABET,
  normalizeUserCode,
} from "@/lib/crypto";
import {
  decideDevice,
  pollDevice,
  startDevice,
  CODE_TTL_SEC,
  POLL_INTERVAL_SEC,
} from "@/lib/services/device";
import { MACHINE_ID, NOW, setup } from "./helpers/fixtures";

const later = (sec: number) => new Date(NOW.getTime() + sec * 1000);
const viewer = { id: "user-1", email: "tess@example.com" };

async function started() {
  const ctx = setup();
  const start = await startDevice(
    ctx.store,
    { machine_id: MACHINE_ID, device_name: "Mac" },
    "https://extynt.com",
    NOW
  );
  return { ...ctx, start };
}

describe("user codes", () => {
  it("are 8 chars from the unambiguous alphabet", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = generateUserCode();
      expect(code).toHaveLength(8);
      expect(isValidUserCode(code)).toBe(true);
    }
    expect(USER_CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(normalizeUserCode("ab-cd 12")).toBe("ABCD12");
  });
});

describe("device flow", () => {
  it("returns the documented start payload and stores only hashes", async () => {
    const { start, state } = await started();
    expect(start).toMatchObject({
      verification_uri: "https://extynt.com/activate",
      interval: POLL_INTERVAL_SEC,
      expires_in: CODE_TTL_SEC,
    });
    expect(JSON.stringify(state.codes)).not.toContain(start.device_code);
    expect(JSON.stringify(state.codes)).not.toContain(start.user_code);
    expect(state.codes[0]?.machineIdHash).toBe(MACHINE_ID);
  });

  it("is pending, then slow_down when polled too fast", async () => {
    const { store, cfg, start } = await started();
    expect((await pollDevice(store, start.device_code, cfg, NOW)).state).toBe(
      "authorization_pending"
    );
    const fast = await pollDevice(store, start.device_code, cfg, later(1));
    expect(fast).toEqual({ state: "slow_down", interval: POLL_INTERVAL_SEC + 5 });
    expect((await pollDevice(store, start.device_code, cfg, later(30))).state).toBe(
      "authorization_pending"
    );
  });
});

describe("device flow approval", () => {
  it("issues a license once after approval", async () => {
    const { store, cfg, start, state } = await started();
    const approved = await decideDevice(
      store,
      viewer,
      { rawCode: start.user_code, approve: true },
      cfg,
      later(2)
    );
    expect(approved.ok).toBe(true);
    const polled = await pollDevice(store, start.device_code, cfg, later(10));
    expect(polled.state).toBe("issued");
    expect(state.devices).toHaveLength(1);
    expect((await pollDevice(store, start.device_code, cfg, later(20))).state).toBe(
      "expired_token"
    );
  });

  it("expires after the ttl", async () => {
    const { store, cfg, start } = await started();
    expect((await pollDevice(store, start.device_code, cfg, later(CODE_TTL_SEC + 1))).state).toBe(
      "expired_token"
    );
    const late = await decideDevice(
      store,
      viewer,
      { rawCode: start.user_code, approve: true },
      cfg,
      later(CODE_TTL_SEC + 1)
    );
    expect(late).toEqual({ ok: false, error: "expired" });
  });

  it("reports denial", async () => {
    const { store, cfg, start } = await started();
    await decideDevice(store, viewer, { rawCode: start.user_code, approve: false }, cfg, later(1));
    expect((await pollDevice(store, start.device_code, cfg, later(10))).state).toBe(
      "access_denied"
    );
  });

  it("rejects unknown device codes and unknown user codes", async () => {
    const { store, cfg } = await started();
    expect((await pollDevice(store, "x".repeat(40), cfg, NOW)).state).toBe("invalid_device_code");
    const r = await decideDevice(store, viewer, { rawCode: "ZZZZZZZZ", approve: true }, cfg, NOW);
    expect(r).toEqual({ ok: false, error: "invalid_code" });
  });

  it("refuses approval from a user without active access", async () => {
    const { store, cfg, start, state } = await started();
    await store.testers.setStatus(viewer.email, "revoked");
    const r = await decideDevice(
      store,
      viewer,
      { rawCode: start.user_code, approve: true },
      cfg,
      later(1)
    );
    expect(r).toEqual({ ok: false, error: "no_access" });
    expect(state.devices).toHaveLength(0);
  });

  it("denies issuing if access is revoked between approval and polling", async () => {
    const { store, cfg, start } = await started();
    await decideDevice(store, viewer, { rawCode: start.user_code, approve: true }, cfg, later(1));
    await store.testers.setStatus(viewer.email, "revoked");
    const polled = await pollDevice(store, start.device_code, cfg, later(10));
    expect(polled).toMatchObject({ state: "access_denied", reason: "revoked" });
  });

  it("cannot approve the same code twice", async () => {
    const { store, cfg, start } = await started();
    await decideDevice(store, viewer, { rawCode: start.user_code, approve: true }, cfg, later(1));
    const again = await decideDevice(
      store,
      viewer,
      { rawCode: start.user_code, approve: true },
      cfg,
      later(2)
    );
    expect(again).toEqual({ ok: false, error: "already_used" });
  });
});
