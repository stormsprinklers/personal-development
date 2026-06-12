const AUTH_STORAGE_KEY = "pd-hub-authenticated";

/** Single-user app password (client-side gate only). */
export const APP_PASSWORD = "Architect(0)";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "1";
}

export function rememberAuthentication(): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, "1");
}

export function clearAuthentication(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function verifyPassword(input: string): boolean {
  return input === APP_PASSWORD;
}
