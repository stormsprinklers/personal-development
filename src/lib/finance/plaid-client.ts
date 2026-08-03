import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID?.trim() && process.env.PLAID_SECRET?.trim());
}

function plaidEnv() {
  const env = (process.env.PLAID_ENV ?? "sandbox").toLowerCase();
  if (env === "production") return PlaidEnvironments.production;
  if (env === "development") return PlaidEnvironments.development;
  return PlaidEnvironments.sandbox;
}

let client: PlaidApi | null = null;

export function getPlaidClient(): PlaidApi {
  if (!plaidConfigured()) {
    throw new Error("Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET.");
  }
  if (!client) {
    const configuration = new Configuration({
      basePath: plaidEnv(),
      baseOptions: {
        headers: {
          "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID!,
          "PLAID-SECRET": process.env.PLAID_SECRET!,
        },
      },
    });
    client = new PlaidApi(configuration);
  }
  return client;
}

export const PLAID_PRODUCTS = [Products.Transactions];
export const PLAID_COUNTRY_CODES = [CountryCode.Us];

export function plaidWebhookUrl(): string | undefined {
  const url = process.env.PLAID_WEBHOOK_URL?.trim();
  return url || undefined;
}
