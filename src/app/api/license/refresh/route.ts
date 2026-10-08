import { getEnv } from "@/lib/env";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { allow, LIMITS } from "@/lib/ratelimit";
import { refreshLicense } from "@/lib/services/license";
import { getStore } from "@/lib/store";

export async function POST(request: Request) {
  const env = getEnv();
  const store = getStore();
  const now = new Date();
  if (
    !(await allow(store, LIMITS.licenseRefresh, clientIp(request.headers), now, env.authSecret))
  ) {
    return jsonError("rate_limited", 429);
  }
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return jsonError("invalid_token", 401);
  const result = await refreshLicense(store, token, env, now);
  if (result.ok) {
    return jsonOk({
      license_token: result.license.token,
      token_type: "license",
      expires_at: result.license.expiresAt,
    });
  }
  const status = result.error === "invalid_token" || result.error === "token_expired" ? 401 : 403;
  return jsonError(result.error, status, "reason" in result ? { reason: result.reason } : {});
}
