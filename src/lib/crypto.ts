import { createHash, randomBytes, randomInt } from "node:crypto";

// No 0/O/1/I/L: unambiguous when read off a screen and typed.
export const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const USER_CODE_LENGTH = 8;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomSecret(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function generateUserCode(): string {
  let code = "";
  for (let i = 0; i < USER_CODE_LENGTH; i += 1) {
    code += USER_CODE_ALPHABET[randomInt(USER_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeUserCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function isValidUserCode(code: string): boolean {
  return code.length === USER_CODE_LENGTH && [...code].every((c) => USER_CODE_ALPHABET.includes(c));
}
