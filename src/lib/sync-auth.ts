const SYNC_HEADER = "x-sync-key";

export function syncKeyFromRequest(request: Request): string | null {
  const header = request.headers.get(SYNC_HEADER)?.trim();
  if (header) return header;
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

export function validateSyncKey(provided: string | null): { ok: true; key: string } | { ok: false; error: string } {
  const expected = process.env.APP_SYNC_KEY?.trim();
  if (!expected) {
    return { ok: false, error: "Cloud storage is not configured (APP_SYNC_KEY missing on server)." };
  }
  if (!provided) {
    return { ok: false, error: "Sync key required. Add your key under Workout settings → Cloud storage." };
  }
  if (provided !== expected) {
    return { ok: false, error: "Invalid sync key." };
  }
  return { ok: true, key: provided };
}

export function cloudStorageConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim() && process.env.APP_SYNC_KEY?.trim());
}
