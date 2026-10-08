import { describe, expect, it } from "vitest";
import { submitApplication } from "@/lib/services/apply";
import { deviceStartSchema, extendSchema } from "@/lib/validation";
import { MACHINE_ID, NOW, setup } from "./helpers/fixtures";

const valid = {
  name: "Ann Example",
  email: "Ann@Example.com",
  aeVersions: ["AE 26"],
  os: "macOS",
  work: "Motion graphics for broadcast",
  portfolioUrl: "",
  consent: true,
};
const ctx = { ip: "203.0.113.5", now: NOW, salt: "salt" };

describe("application validation", () => {
  it("stores a valid application with a lowercase email and consent time", async () => {
    const { store, state } = setup();
    expect(await submitApplication(store, valid, ctx)).toEqual({ ok: true });
    expect(state.applications[0]).toMatchObject({
      email: "ann@example.com",
      portfolioUrl: null,
      consentAt: NOW,
    });
  });

  it.each([
    ["no consent", { consent: false }, "consent"],
    ["bad email", { email: "nope" }, "email"],
    ["no versions", { aeVersions: [] }, "aeVersions"],
    ["bad os", { os: "Linux" }, "os"],
    ["empty work", { work: "  " }, "work"],
    ["bad url", { portfolioUrl: "javascript:alert(1)" }, "portfolioUrl"],
    ["long work", { work: "x".repeat(1001) }, "work"],
  ])("rejects %s", async (_n, patch, field) => {
    const { store, state } = setup();
    const r = await submitApplication(store, { ...valid, ...patch }, ctx);
    expect(r).toMatchObject({ ok: false, error: "invalid" });
    expect(r.ok === false && r.error === "invalid" && field in r.fields).toBe(true);
    expect(state.applications).toHaveLength(0);
  });

  it("silently drops honeypot submissions", async () => {
    const { store, state } = setup();
    expect(await submitApplication(store, { ...valid, website: "http://spam" }, ctx)).toEqual({
      ok: true,
    });
    expect(state.applications).toHaveLength(0);
  });

  it("treats a duplicate email as success without a second row", async () => {
    const { store, state } = setup();
    await submitApplication(store, valid, ctx);
    expect(await submitApplication(store, valid, ctx)).toEqual({ ok: true });
    expect(state.applications).toHaveLength(1);
  });

  it("rate limits per IP", async () => {
    const { store } = setup();
    const results = [];
    for (let i = 0; i < 6; i += 1) results.push(await submitApplication(store, valid, ctx));
    expect(results[5]).toEqual({ ok: false, error: "rate_limited" });
    const other = await submitApplication(store, valid, { ...ctx, ip: "198.51.100.9" });
    expect(other.ok).toBe(true);
  });

  it("never stores the raw IP in rate-limit keys", async () => {
    const { store, state } = setup();
    await submitApplication(store, valid, ctx);
    expect([...state.rate.keys()].join()).not.toContain("203.0.113.5");
  });
});

describe("device and admin input", () => {
  it("requires a 64-hex machine_id", () => {
    expect(deviceStartSchema.safeParse({ machine_id: MACHINE_ID }).success).toBe(true);
    expect(deviceStartSchema.safeParse({}).success).toBe(false);
    expect(deviceStartSchema.safeParse({ machine_id: "ABC" }).success).toBe(false);
    expect(deviceStartSchema.safeParse({ machine_id: "A".repeat(64) }).success).toBe(false);
  });

  it("parses extend dates", () => {
    expect(extendSchema.safeParse({ email: "a@b.co", until: "2027-02-01" }).success).toBe(true);
    expect(extendSchema.safeParse({ email: "a@b.co", until: "soon" }).success).toBe(false);
  });
});
