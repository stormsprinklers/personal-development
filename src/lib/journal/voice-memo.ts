const VOICE_MEMO_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export const VOICE_MEMO_MAX_BYTES = 25 * 1024 * 1024;
export const VOICE_MEMO_MAX_DURATION_MS = 5 * 60 * 1000;

export function voiceMemoBlobPrefix(userId: string) {
  return `journal-voice/${userId}/`;
}

export function voiceMemoBlobPath(userId: string, filename: string) {
  return `${voiceMemoBlobPrefix(userId)}${filename}`;
}

export function isVoiceMemoPathForUser(pathname: string, userId: string) {
  return pathname.startsWith(voiceMemoBlobPrefix(userId));
}

export function voiceMemoExpiresAt(recordedAt: Date = new Date()) {
  return new Date(recordedAt.getTime() + VOICE_MEMO_RETENTION_MS);
}

export function isVoiceMemoExpired(expiresAt: string | Date) {
  const value = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isNaN(value.getTime()) || value.getTime() <= Date.now();
}
