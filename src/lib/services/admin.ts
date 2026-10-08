import { assertAdmin } from "@/lib/admin";
import type { Store } from "@/lib/store/types";

export interface AdminContext {
  actorEmail: string | null | undefined;
  adminEmails: string[];
  now: Date;
}

export interface AdminDeps {
  sendInvite(email: string): Promise<void>;
}

export type AdminResult = { ok: true; inviteSent?: boolean } | { ok: false; error: "not_found" };

const NOT_FOUND = { ok: false, error: "not_found" } as const;

export async function approveApplication(
  store: Store,
  ctx: AdminContext,
  deps: AdminDeps,
  applicationId: string
): Promise<AdminResult> {
  const actor = assertAdmin(ctx.actorEmail, ctx.adminEmails);
  const app = await store.applications.get(applicationId);
  if (!app) return NOT_FOUND;
  await store.testers.upsertActive(app.email, app.id, null);
  await store.applications.setStatus(app.id, "approved", actor, ctx.now);
  try {
    await deps.sendInvite(app.email);
    return { ok: true, inviteSent: true };
  } catch {
    return { ok: true, inviteSent: false };
  }
}

export async function rejectApplication(
  store: Store,
  ctx: AdminContext,
  applicationId: string
): Promise<AdminResult> {
  const actor = assertAdmin(ctx.actorEmail, ctx.adminEmails);
  const app = await store.applications.get(applicationId);
  if (!app) return NOT_FOUND;
  await store.applications.setStatus(app.id, "rejected", actor, ctx.now);
  return { ok: true };
}

export async function revokeTester(
  store: Store,
  ctx: AdminContext,
  email: string
): Promise<AdminResult> {
  assertAdmin(ctx.actorEmail, ctx.adminEmails);
  return (await store.testers.setStatus(email, "revoked")) ? { ok: true } : NOT_FOUND;
}

export async function restoreTester(
  store: Store,
  ctx: AdminContext,
  email: string
): Promise<AdminResult> {
  assertAdmin(ctx.actorEmail, ctx.adminEmails);
  return (await store.testers.setStatus(email, "active")) ? { ok: true } : NOT_FOUND;
}

export async function extendTester(
  store: Store,
  ctx: AdminContext,
  email: string,
  until: Date
): Promise<AdminResult> {
  assertAdmin(ctx.actorEmail, ctx.adminEmails);
  return (await store.testers.setAccessUntil(email, until)) ? { ok: true } : NOT_FOUND;
}

export async function revokeDevice(
  store: Store,
  ctx: AdminContext,
  deviceId: string
): Promise<AdminResult> {
  assertAdmin(ctx.actorEmail, ctx.adminEmails);
  return (await store.devices.revoke(deviceId, ctx.now)) ? { ok: true } : NOT_FOUND;
}

export async function loadAdminData(store: Store, ctx: AdminContext) {
  assertAdmin(ctx.actorEmail, ctx.adminEmails);
  const [applications, testers, devices] = await Promise.all([
    store.applications.list(),
    store.testers.list(),
    store.devices.listAll(),
  ]);
  return { applications, testers, devices };
}
