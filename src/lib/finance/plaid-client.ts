import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID?.trim() && process.env.PLAID_SECRET_KEY?.trim());
}

export function getPlaidEnvName(): "sandbox" | "development" | "production" {
  const env = (process.env.PLAID_ENV ?? "sandbox").trim().toLowerCase();
  if (env === "production") return "production";
  if (env === "development") return "development";
  return "sandbox";
}

function plaidBasePath() {
  const env = getPlaidEnvName();
  if (env === "production") return PlaidEnvironments.production;
  if (env === "development") return PlaidEnvironments.development;
  return PlaidEnvironments.sandbox;
}

/** Avoid reusing a client built for a different env/keys after env changes. */
let client: PlaidApi | null = null;
let clientFingerprint: string | null = null;

function currentClientFingerprint() {
  return [
    getPlaidEnvName(),
    process.env.PLAID_CLIENT_ID?.trim() ?? "",
    process.env.PLAID_SECRET_KEY?.trim() ?? "",
  ].join("|");
}

export function getPlaidClient(): PlaidApi {
  if (!plaidConfigured()) {
    throw new Error("Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET_KEY.");
  }
  const fingerprint = currentClientFingerprint();
  if (!client || clientFingerprint !== fingerprint) {
    const configuration = new Configuration({
      basePath: plaidBasePath(),
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!.trim(),
          "PLAID-SECRET": process.env.PLAID_SECRET_KEY!.trim(),
        },
      },
    });
    client = new PlaidApi(configuration);
    clientFingerprint = fingerprint;
  }
  return client;
}

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us];

/** Only return a webhook URL if it is a valid https URL (Plaid rejects bad patterns). */
export function plaidWebhookUrl(): string | undefined {
  const raw = process.env.PLAID_WEBHOOK_URL?.trim();
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return undefined;
    return raw;
  } catch {
    return undefined;
  }
}

export function plaidErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const ax = error as {
      response?: { data?: { error_message?: string; error_code?: string; error_type?: string } };
      message?: string;
    };
    const data = ax.response?.data;
    if (data?.error_message) {
      const code = data.error_code ? ` (${data.error_code})` : "";
      return `${data.error_message}${code}`;
    }
    if (typeof ax.message === "string" && ax.message) return ax.message;
  }
  return "Plaid request failed.";
}
