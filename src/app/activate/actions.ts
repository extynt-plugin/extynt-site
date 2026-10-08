"use server";

import { redirect } from "next/navigation";
import { getEnv } from "@/lib/env";
import { allow, LIMITS } from "@/lib/ratelimit";
import { decideDevice } from "@/lib/services/device";
import { getStore } from "@/lib/store";
import { getViewer } from "@/lib/viewer";
import { userCodeSchema } from "@/lib/validation";

export async function decideAction(form: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const parsed = userCodeSchema.safeParse({ code: form.get("code") });
  if (!parsed.success) redirect("/activate?error=invalid_code");
  const env = getEnv();
  const store = getStore();
  const now = new Date();
  if (!(await allow(store, LIMITS.activate, viewer.id, now, env.authSecret))) {
    redirect("/activate?error=rate_limited");
  }
  const approve = form.get("decision") === "approve";
  const result = await decideDevice(
    store,
    viewer,
    { rawCode: parsed.data.code, approve },
    env,
    now
  );
  if (!result.ok) redirect(`/activate?error=${result.error}`);
  redirect(approve ? "/activate?done=approved" : "/activate?done=denied");
}
