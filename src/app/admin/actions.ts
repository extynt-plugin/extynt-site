"use server";

import { revalidatePath } from "next/cache";
import { ForbiddenError } from "@/lib/admin";
import { getEnv } from "@/lib/env";
import { sendInvite } from "@/lib/mail-invite";
import * as admin from "@/lib/services/admin";
import { getStore } from "@/lib/store";
import { getViewer } from "@/lib/viewer";
import { extendSchema, emailSchema, uuidSchema } from "@/lib/validation";

async function context(): Promise<admin.AdminContext> {
  const viewer = await getViewer();
  const env = getEnv();
  if (!viewer) throw new ForbiddenError();
  return { actorEmail: viewer.email, adminEmails: env.adminEmails, now: new Date() };
}

function done() {
  revalidatePath("/admin");
}

export async function approveAction(form: FormData): Promise<void> {
  const ctx = await context();
  const id = uuidSchema.parse(form.get("id"));
  await admin.approveApplication(getStore(), ctx, { sendInvite }, id);
  done();
}

export async function rejectAction(form: FormData): Promise<void> {
  const ctx = await context();
  await admin.rejectApplication(getStore(), ctx, uuidSchema.parse(form.get("id")));
  done();
}

export async function revokeTesterAction(form: FormData): Promise<void> {
  const ctx = await context();
  await admin.revokeTester(getStore(), ctx, emailSchema.parse({ email: form.get("email") }).email);
  done();
}

export async function restoreTesterAction(form: FormData): Promise<void> {
  const ctx = await context();
  await admin.restoreTester(getStore(), ctx, emailSchema.parse({ email: form.get("email") }).email);
  done();
}

export async function extendTesterAction(form: FormData): Promise<void> {
  const ctx = await context();
  const { email, until } = extendSchema.parse({
    email: form.get("email"),
    until: form.get("until"),
  });
  await admin.extendTester(getStore(), ctx, email, until);
  done();
}

export async function revokeDeviceAction(form: FormData): Promise<void> {
  const ctx = await context();
  await admin.revokeDevice(getStore(), ctx, uuidSchema.parse(form.get("id")));
  done();
}
