import { NextResponse } from "next/server";

export function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json(
    { error, ...extra },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export function jsonOk(body: object) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
