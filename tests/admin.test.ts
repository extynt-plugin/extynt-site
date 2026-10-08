import { describe, expect, it, vi } from "vitest";
import { assertAdmin, ForbiddenError, isAdminEmail } from "@/lib/admin";
import { parseAdminEmails } from "@/lib/env";
import * as admin from "@/lib/services/admin";
import { canSignIn } from "@/lib/services/signin";
import { NOW, setup } from "./helpers/fixtures";

const admins = parseAdminEmails(" Owner@Example.com, ,second@example.com ");
const ctx = (actorEmail: string | null): admin.AdminContext => ({
  actorEmail,
  adminEmails: admins,
  now: NOW,
});

async function withApplication() {
  const s = setup();
  await s.store.applications.insert({
    name: "Ann",
    email: "ann@example.com",
    aeVersions: ["AE 26"],
    os: "macOS",
    work: "Motion design",
    portfolioUrl: null,
    consentAt: NOW,
  });
  return { ...s, appId: s.state.applications[0]!.id };
}

describe("admin identity", () => {
  it("parses ADMIN_EMAILS case-insensitively and never defaults to anyone", () => {
    expect(admins).toEqual(["owner@example.com", "second@example.com"]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(isAdminEmail("OWNER@example.com", admins)).toBe(true);
    expect(isAdminEmail("x@example.com", [])).toBe(false);
    expect(isAdminEmail(null, admins)).toBe(false);
  });
});

describe("admin authorization", () => {
  it.each([null, undefined, "tess@example.com", ""])(
    "forbids non-admin actor %s on every action",
    async (actor) => {
      const { store, appId, state } = await withApplication();
      const c = ctx(actor as string | null);
      const sendInvite = vi.fn();
      const calls = [
        () => admin.approveApplication(store, c, { sendInvite }, appId),
        () => admin.rejectApplication(store, c, appId),
        () => admin.revokeTester(store, c, "tess@example.com"),
        () => admin.restoreTester(store, c, "tess@example.com"),
        () => admin.extendTester(store, c, "tess@example.com", NOW),
        () => admin.revokeDevice(store, c, "x"),
        () => admin.loadAdminData(store, c),
      ];
      for (const call of calls) await expect(call()).rejects.toBeInstanceOf(ForbiddenError);
      expect(sendInvite).not.toHaveBeenCalled();
      expect(state.applications[0]!.status).toBe("pending");
      expect(state.testers[0]!.status).toBe("active");
    }
  );

  it("assertAdmin returns the normalised actor", () => {
    expect(assertAdmin(" OWNER@example.com ", admins)).toBe("owner@example.com");
  });
});

describe("admin actions", () => {
  const owner = ctx("owner@example.com");

  it("approve creates the tester, marks approved and sends the invite", async () => {
    const { store, appId, state } = await withApplication();
    const sendInvite = vi.fn().mockResolvedValue(undefined);
    const r = await admin.approveApplication(store, owner, { sendInvite }, appId);
    expect(r).toEqual({ ok: true, inviteSent: true });
    expect(sendInvite).toHaveBeenCalledWith("ann@example.com");
    expect(state.applications[0]).toMatchObject({
      status: "approved",
      reviewedBy: "owner@example.com",
    });
    expect(await store.testers.byEmail("ann@example.com")).toMatchObject({ status: "active" });
  });

  it("approve still records access when the invite email fails", async () => {
    const { store, appId } = await withApplication();
    const r = await admin.approveApplication(
      store,
      owner,
      { sendInvite: vi.fn().mockRejectedValue(new Error("x")) },
      appId
    );
    expect(r).toEqual({ ok: true, inviteSent: false });
    expect(await store.testers.byEmail("ann@example.com")).not.toBeNull();
  });

  it("reject, revoke, extend and device revoke work for admins", async () => {
    const { store, appId, state } = await withApplication();
    expect((await admin.rejectApplication(store, owner, appId)).ok).toBe(true);
    expect(state.applications[0]!.status).toBe("rejected");
    expect((await admin.revokeTester(store, owner, "tess@example.com")).ok).toBe(true);
    expect((await admin.extendTester(store, owner, "tess@example.com", NOW)).ok).toBe(true);
    expect(state.testers[0]).toMatchObject({ status: "revoked", accessUntil: NOW });
    expect(await admin.revokeTester(store, owner, "nobody@example.com")).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(
      await admin.approveApplication(store, owner, { sendInvite: vi.fn() }, "missing")
    ).toEqual({ ok: false, error: "not_found" });
  });
});

describe("sign-in gate", () => {
  const cfg = { adminEmails: admins, betaEndsAt: new Date("2027-03-31T00:00:00Z") };

  it("lets admins and active testers in only", async () => {
    const { store } = setup();
    expect(await canSignIn(store, "owner@example.com", cfg, NOW)).toBe(true);
    expect(await canSignIn(store, "TESS@example.com", cfg, NOW)).toBe(true);
    expect(await canSignIn(store, "stranger@example.com", cfg, NOW)).toBe(false);
  });

  it("blocks revoked, expired and post-beta testers", async () => {
    const { store } = setup();
    await store.testers.setStatus("tess@example.com", "revoked");
    expect(await canSignIn(store, "tess@example.com", cfg, NOW)).toBe(false);
    await store.testers.setStatus("tess@example.com", "active");
    await store.testers.setAccessUntil("tess@example.com", new Date(NOW.getTime() - 1));
    expect(await canSignIn(store, "tess@example.com", cfg, NOW)).toBe(false);
    await store.testers.setAccessUntil("tess@example.com", null);
    expect(
      await canSignIn(
        store,
        "tess@example.com",
        { ...cfg, betaEndsAt: new Date(NOW.getTime() - 1) },
        NOW
      )
    ).toBe(false);
  });
});
