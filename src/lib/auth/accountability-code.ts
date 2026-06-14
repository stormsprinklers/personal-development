import { randomBytes } from "crypto";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateAccountabilityCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }
  return code;
}

export function normalizeAccountabilityCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidAccountabilityCode(code: string): boolean {
  return /^[A-Z0-9]{6,12}$/.test(code);
}
