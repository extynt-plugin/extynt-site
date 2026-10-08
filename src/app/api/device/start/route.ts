import { getEnv } from "@/lib/env";
import { clientIp, jsonError, jsonOk, readJson } from "@/lib/http";
import { allow, LIMITS } from "@/lib/ratelimit";
import { startDevice } from "@/lib/services/device";
import { getStore } from "@/lib/store";
import { deviceStartSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const env = getEnv();
  const store = getStore();
  const now = new Date();
  const ip = clientIp(request.headers);
  if (!(await allow(store, LIMITS.deviceStart, ip, now, env.authSecret))) {
    return jsonError("rate_limited", 429);
  }
  const parsed = deviceStartSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_request", 400);
  return jsonOk(await startDevice(store, parsed.data, env.siteUrl, now));
}
