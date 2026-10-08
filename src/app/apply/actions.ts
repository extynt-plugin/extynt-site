"use server";

import { headers } from "next/headers";
import { getEnv } from "@/lib/env";
import { clientIp } from "@/lib/http";
import { submitApplication } from "@/lib/services/apply";
import { getStore } from "@/lib/store";

export interface ApplyState {
  status: "idle" | "done" | "invalid" | "rate_limited" | "error";
  fields: Record<string, string>;
}

export async function applyAction(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const raw = {
    name: form.get("name"),
    email: form.get("email"),
    aeVersions: form.getAll("aeVersions"),
    os: form.get("os"),
    work: form.get("work"),
    portfolioUrl: form.get("portfolioUrl") ?? "",
    consent: form.get("consent") === "on",
    website: form.get("website") ?? "",
  };
  try {
    const ip = clientIp(await headers());
    const result = await submitApplication(getStore(), raw, {
      ip,
      now: new Date(),
      salt: getEnv().authSecret,
    });
    if (result.ok) return { status: "done", fields: {} };
    return result.error === "invalid"
      ? { status: "invalid", fields: result.fields }
      : { status: "rate_limited", fields: {} };
  } catch (error) {
    console.error("apply failed", error);
    return { status: "error", fields: {} };
  }
}
