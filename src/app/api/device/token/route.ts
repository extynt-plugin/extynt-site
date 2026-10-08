import { getEnv } from "@/lib/env";
import { clientIp, jsonError, jsonOk, readJson } from "@/lib/http";
import { allow, LIMITS } from "@/lib/ratelimit";
import { pollDevice } from "@/lib/services/device";
import { getStore } from "@/lib/store";
import { deviceTokenSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const env = getEnv();
  const store = getStore();
  const now = new Date();
  if (!(await allow(store, LIMITS.deviceToken, clientIp(request.headers), now, env.authSecret))) {
    return jsonError("rate_limited", 429);
  }
  const parsed = deviceTokenSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("invalid_request", 400);
  const result = await pollDevice(store, parsed.data.device_code, env, now);
  switch (result.state) {
    case "issued":
      return jsonOk({
        license_token: result.license.token,
        token_type: "license",
        expires_at: result.license.expiresAt,
      });
    case "slow_down":
      return jsonError("slow_down", 400, { interval: result.interval });
    case "access_denied":
      return jsonError("access_denied", 403, result.reason ? { reason: result.reason } : {});
    case "invalid_device_code":
      return jsonError("invalid_device_code", 400);
    default:
      return jsonError(result.state, 400);
  }
}
