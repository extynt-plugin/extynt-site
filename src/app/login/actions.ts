"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { getEnv } from "@/lib/env";
import { clientIp } from "@/lib/http";
import { allow, LIMITS } from "@/lib/ratelimit";
import { canSignIn } from "@/lib/services/signin";
import { getStore } from "@/lib/store";
import { emailSchema } from "@/lib/validation";

// Every outcome lands on the same "check your email" page so the form cannot reveal who is a tester.
export async function requestLink(form: FormData): Promise<void> {
  const parsed = emailSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) redirect("/login?invalid=1");
  const env = getEnv();
  const store = getStore();
  const now = new Date();
  const ip = clientIp(await headers());
  const permitted = await allow(store, LIMITS.login, ip, now, env.authSecret);
  if (permitted && (await canSignIn(store, parsed.data.email, env, now))) {
    await signIn("resend", { email: parsed.data.email, redirectTo: "/account" });
  }
  redirect("/login/check");
}
