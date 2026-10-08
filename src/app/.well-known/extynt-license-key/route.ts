import { getEnv } from "@/lib/env";
import { keyId, publicKeyOf, publicKeyPem } from "@/lib/license/token";

export const dynamic = "force-dynamic";

export function GET() {
  const { signingKey } = getEnv();
  return new Response(publicKeyPem(signingKey), {
    headers: {
      "Content-Type": "application/x-pem-file; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
      "X-Extynt-Key-Id": keyId(publicKeyOf(signingKey)),
    },
  });
}
