import { NextResponse } from "next/server";
import { requireSession, databaseConfigured } from "@/lib/auth/require-session";
import {
  getPlaidClient,
  getPlaidEnvName,
  plaidConfigured,
  plaidErrorMessage,
  plaidWebhookUrl,
  PLAID_COUNTRY_CODES,
  PLAID_PRODUCTS,
} from "@/lib/finance/plaid-client";
import { ensureFinanceCategories } from "@/lib/finance/categories";

export async function POST() {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  }
  if (!plaidConfigured()) {
    return NextResponse.json(
      { error: "Plaid is not configured. Set PLAID_CLIENT_ID and PLAID_SECRET_KEY." },
      { status: 503 },
    );
  }

  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  await ensureFinanceCategories(auth.session.userId);

  const client = getPlaidClient();
  const webhook = plaidWebhookUrl();
  const envName = getPlaidEnvName();

  try {
    const res = await client.linkTokenCreate({
      user: { client_user_id: auth.session.userId },
      client_name: "Personal Development Hub",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
      ...(webhook ? { webhook } : {}),
      transactions: { days_requested: 365 },
    });

    return NextResponse.json({ link_token: res.data.link_token, env: envName });
  } catch (e) {
    console.error("Plaid linkTokenCreate failed", e);
    return NextResponse.json(
      {
        error: plaidErrorMessage(e),
        env: envName,
        hint:
          envName !== "production"
            ? "Production secrets require PLAID_ENV=production (and a redeploy)."
            : "Check PLAID_CLIENT_ID / PLAID_SECRET_KEY are Production keys with no extra quotes/spaces, and PLAID_WEBHOOK_URL is a valid https URL.",
      },
      { status: 502 },
    );
  }
}
