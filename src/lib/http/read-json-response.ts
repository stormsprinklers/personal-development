/**
 * Parse a fetch Response body as JSON without surfacing Safari's opaque
 * "The string did not match the expected pattern." error when the body is
 * empty or not JSON (e.g. an HTML error page).
 */
export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}). Please try again.`);
    }
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Server returned an invalid response."
        : `Request failed (${response.status}). Please try again.`,
    );
  }
}
