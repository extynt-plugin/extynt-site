import { describe, expect, it } from "vitest";
import { computeExpiry, LICENSE_TTL_SEC } from "@/lib/license/expiry";
import { signLicense, verifyLicense, publicKeyOf, type LicenseClaims } from "@/lib/license/token";
import { NOW, newSigningKey } from "./helpers/fixtures";

const nowSec = Math.floor(NOW.getTime() / 1000);
const claims = (over: Partial<LicenseClaims> = {}): LicenseClaims => ({
  iss: "extynt.com",
  sub: "u",
  email: "a@b.co",
  did: "d",
  iat: nowSec,
  exp: nowSec + 100,
  plan: "beta",
  ...over,
});

describe("license token", () => {
  const key = newSigningKey();
  const pub = publicKeyOf(key);

  it("round-trips valid claims", () => {
    const result = verifyLicense(signLicense(claims(), key), pub, nowSec);
    expect(result).toEqual({ ok: true, claims: claims() });
  });

  it("rejects expired tokens", () => {
    const token = signLicense(claims({ exp: nowSec - 1 }), key);
    expect(verifyLicense(token, pub, nowSec)).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a token signed by another key", () => {
    const token = signLicense(claims(), newSigningKey());
    expect(verifyLicense(token, pub, nowSec)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects tampered payloads", () => {
    const [h, p, s] = signLicense(claims(), key).split(".");
    const forged = Buffer.from(JSON.stringify(claims({ exp: nowSec + 99999 }))).toString(
      "base64url"
    );
    expect(p).not.toBe(forged);
    expect(verifyLicense(`${h}.${forged}.${s}`, pub, nowSec)).toMatchObject({ ok: false });
  });

  it("rejects non-EdDSA headers and garbage", () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    expect(verifyLicense(`${header}.e30.x`, pub, nowSec)).toEqual({
      ok: false,
      reason: "malformed",
    });
    expect(verifyLicense("nope", pub, nowSec)).toEqual({ ok: false, reason: "malformed" });
  });

  it("accepts every plan value and rejects unknown ones", () => {
    for (const plan of ["beta", "trial", "license"] as const) {
      expect(verifyLicense(signLicense(claims({ plan }), key), pub, nowSec).ok).toBe(true);
    }
    const bad = signLicense(claims({ plan: "enterprise" as never }), key);
    expect(verifyLicense(bad, pub, nowSec)).toEqual({ ok: false, reason: "malformed" });
  });
});

describe("expiry clamping", () => {
  const far = new Date("2030-01-01T00:00:00Z");

  it("uses 7 days when nothing is sooner", () => {
    expect(computeExpiry({ nowSec, accessUntil: null, betaEndsAt: far })).toBe(
      nowSec + LICENSE_TTL_SEC
    );
  });

  it("clamps to access_until", () => {
    const until = new Date(NOW.getTime() + 2 * 86400_000);
    expect(computeExpiry({ nowSec, accessUntil: until, betaEndsAt: far })).toBe(nowSec + 2 * 86400);
  });

  it("clamps to the global beta end", () => {
    const end = new Date(NOW.getTime() + 3600_000);
    expect(computeExpiry({ nowSec, accessUntil: null, betaEndsAt: end })).toBe(nowSec + 3600);
  });

  it("returns null once either limit has passed", () => {
    const past = new Date(NOW.getTime() - 1000);
    expect(computeExpiry({ nowSec, accessUntil: past, betaEndsAt: far })).toBeNull();
    expect(computeExpiry({ nowSec, accessUntil: null, betaEndsAt: past })).toBeNull();
  });
});
