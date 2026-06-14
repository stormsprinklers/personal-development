import { readFileSync } from "fs";
import { resolve } from "path";

/** Load .env.local then .env so Prisma scripts work without dotenv. */
export function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    try {
      const content = readFileSync(resolve(process.cwd(), file), "utf8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    } catch {
      // file missing
    }
  }
}
