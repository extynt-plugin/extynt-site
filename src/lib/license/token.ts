import { createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import { sha256Hex } from "@/lib/crypto";

const LICENSE_PLANS = ["beta", "trial", "license"] as const;
export type LicensePlan = (typeof LICENSE_PLANS)[number];

export interface LicenseClaims {
  iss: "extynt.com";
  sub: string;
  email: string;
  did: string;
  iat: number;
  exp: number;
  plan: LicensePlan;
}

export type VerifyResult =
  | { ok: true; claims: LicenseClaims }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");

export function publicKeyOf(privatePem: string): KeyObject {
  return createPublicKey(createPrivateKey(privatePem));
}

export function publicKeyPem(privatePem: string): string {
  return publicKeyOf(privatePem).export({ type: "spki", format: "pem" }).toString();
}

export function keyId(publicKey: KeyObject): string {
  const der = publicKey.export({ type: "spki", format: "der" });
  return sha256Hex(der.toString("base64")).slice(0, 16);
}

export function signLicense(claims: LicenseClaims, privatePem: string): string {
  const key = createPrivateKey(privatePem);
  const kid = keyId(createPublicKey(key));
  const signingInput = `${encode({ alg: "EdDSA", typ: "JWT", kid })}.${encode(claims)}`;
  const signature = sign(null, Buffer.from(signingInput), key).toString("base64url");
  return `${signingInput}.${signature}`;
}

function parseClaims(payload: string): LicenseClaims | null {
  try {
    const c = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as Partial<LicenseClaims>;
    const ok =
      c.iss === "extynt.com" &&
      LICENSE_PLANS.includes(c.plan as LicensePlan) &&
      typeof c.sub === "string" &&
      typeof c.email === "string" &&
      typeof c.did === "string" &&
      Number.isInteger(c.iat) &&
      Number.isInteger(c.exp);
    return ok ? (c as LicenseClaims) : null;
  } catch {
    return null;
  }
}

function headerIsEdDsa(header: string): boolean {
  try {
    const h = JSON.parse(Buffer.from(header, "base64url").toString("utf8")) as { alg?: string };
    return h.alg === "EdDSA";
  } catch {
    return false;
  }
}

export function verifyLicense(token: string, publicKey: KeyObject, nowSec: number): VerifyResult {
  const parts = token.split(".");
  const [header, payload, signature] = parts;
  if (parts.length !== 3 || !header || !payload || !signature || !headerIsEdDsa(header)) {
    return { ok: false, reason: "malformed" };
  }
  const valid = verify(
    null,
    Buffer.from(`${header}.${payload}`),
    publicKey,
    Buffer.from(signature, "base64url")
  );
  if (!valid) return { ok: false, reason: "bad_signature" };
  const claims = parseClaims(payload);
  if (!claims) return { ok: false, reason: "malformed" };
  if (claims.exp <= nowSec) return { ok: false, reason: "expired" };
  return { ok: true, claims };
}
