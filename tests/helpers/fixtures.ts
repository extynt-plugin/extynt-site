import { generateKeyPairSync } from "node:crypto";
import type { LicenseCfg } from "@/lib/license/issue";
import { createMemoryStore } from "./memory-store";

export const MACHINE_ID = "a".repeat(64);
export const NOW = new Date("2027-01-10T12:00:00Z");

export function newSigningKey(): string {
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ type: "pkcs8", format: "pem" }).toString();
}

export function setup(overrides: Partial<LicenseCfg> = {}) {
  const mem = createMemoryStore();
  const cfg: LicenseCfg = {
    signingKey: newSigningKey(),
    betaEndsAt: new Date("2027-03-31T23:59:59Z"),
    ...overrides,
  };
  mem.state.users.push({ id: "user-1", email: "tess@example.com" });
  void mem.store.testers.upsertActive("tess@example.com", null, null);
  return { ...mem, cfg };
}
