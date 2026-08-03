import { Prisma } from "@prisma/client";
import type { Transaction, RemovedTransaction, AccountsGetResponse } from "plaid";
import { prisma } from "@/lib/prisma";
import { getPlaidClient } from "@/lib/finance/plaid-client";
import {
  buildCategoryNameMap,
  loadMerchantRuleCache,
  resolveCategoryAndFlow,
  upsertMerchant,
} from "@/lib/finance/rules";
import { normalizeMerchantKey } from "@/lib/finance/merchant";

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  // Store as UTC noon to avoid TZ edge cases on DATE columns
  return new Date(`${value}T12:00:00.000Z`);
}

async function upsertAccountsFromPlaid(
  userId: string,
  plaidItemDbId: string,
  accounts: AccountsGetResponse["accounts"],
) {
  for (const acct of accounts) {
    await prisma.financeAccount.upsert({
      where: { plaidAccountId: acct.account_id },
      create: {
        userId,
        plaidItemId: plaidItemDbId,
        plaidAccountId: acct.account_id,
        name: acct.name,
        officialName: acct.official_name ?? null,
        mask: acct.mask ?? null,
        type: acct.type,
        subtype: acct.subtype ?? null,
        isoCurrencyCode: acct.balances.iso_currency_code ?? "USD",
      },
      update: {
        name: acct.name,
        officialName: acct.official_name ?? null,
        mask: acct.mask ?? null,
        type: acct.type,
        subtype: acct.subtype ?? null,
        isoCurrencyCode: acct.balances.iso_currency_code ?? "USD",
      },
    });
  }
}

async function applyAddedOrModified(
  userId: string,
  tx: Transaction,
  accountByPlaidId: Map<string, { id: string; type: string; subtype: string | null }>,
  ruleCache: Awaited<ReturnType<typeof loadMerchantRuleCache>>,
  categoryNameToId: Map<string, string>,
) {
  const account = accountByPlaidId.get(tx.account_id);
  if (!account) return;

  const merchant = await upsertMerchant(userId, tx.merchant_name, tx.name);
  const merchantKey = merchant?.key ?? normalizeMerchantKey(tx.merchant_name ?? tx.name);
  const pfc = tx.personal_finance_category;

  const resolved = await resolveCategoryAndFlow({
    userId,
    amount: tx.amount,
    accountType: account.type,
    accountSubtype: account.subtype,
    pending: Boolean(tx.pending),
    transferId: tx.transaction_code === "transfer" ? tx.transaction_id : (tx as { transfer_id?: string }).transfer_id ?? null,
    paymentChannel: tx.payment_channel ?? null,
    plaidPfcPrimary: pfc?.primary ?? null,
    plaidPfcDetailed: pfc?.detailed ?? null,
    name: tx.name,
    merchantName: tx.merchant_name ?? null,
    merchantKey,
    ruleCache,
    categoryNameToId,
  });

  const date = parseDateOnly(tx.date);
  if (!date) return;

  const data = {
    userId,
    accountId: account.id,
    merchantId: merchant?.id ?? null,
    categoryId: resolved.categoryId,
    date,
    authorizedDate: parseDateOnly(tx.authorized_date),
    name: tx.name,
    merchantName: tx.merchant_name ?? null,
    amount: new Prisma.Decimal(tx.amount),
    isoCurrencyCode: tx.iso_currency_code ?? "USD",
    pending: Boolean(tx.pending),
    flowType: resolved.flowType,
    reviewStatus: resolved.reviewStatus,
    plaidPfcPrimary: pfc?.primary ?? null,
    plaidPfcDetailed: pfc?.detailed ?? null,
    plaidPfcConfidence: pfc?.confidence_level ?? null,
    transferId: (tx as { transfer_id?: string }).transfer_id ?? null,
    paymentChannel: tx.payment_channel ?? null,
  };

  await prisma.financeTransaction.upsert({
    where: { plaidTransactionId: tx.transaction_id },
    create: { ...data, plaidTransactionId: tx.transaction_id },
    update: data,
  });
}

async function removeTransactions(removed: RemovedTransaction[]) {
  const ids = removed.map((r) => r.transaction_id).filter(Boolean);
  if (!ids.length) return;
  await prisma.financeTransaction.deleteMany({
    where: { plaidTransactionId: { in: ids } },
  });
}

/** Sync all pages of /transactions/sync for a stored Plaid item. */
export async function syncPlaidItem(plaidItemDbId: string) {
  const item = await prisma.financePlaidItem.findUnique({ where: { id: plaidItemDbId } });
  if (!item) throw new Error("Plaid item not found.");

  const client = getPlaidClient();
  const categoryNameToId = await buildCategoryNameMap(item.userId);
  const ruleCache = await loadMerchantRuleCache(item.userId);

  // Refresh account metadata
  const accountsRes = await client.accountsGet({ access_token: item.accessToken });
  await upsertAccountsFromPlaid(item.userId, item.id, accountsRes.data.accounts);

  const accounts = await prisma.financeAccount.findMany({
    where: { plaidItemId: item.id },
  });
  const accountByPlaidId = new Map(
    accounts.map((a) => [a.plaidAccountId, { id: a.id, type: a.type, subtype: a.subtype }]),
  );

  let cursor = item.cursor ?? undefined;
  let hasMore = true;

  while (hasMore) {
    const res = await client.transactionsSync({
      access_token: item.accessToken,
      cursor,
      count: 500,
    });
    const { added, modified, removed, next_cursor, has_more } = res.data;

    for (const tx of added) {
      await applyAddedOrModified(item.userId, tx, accountByPlaidId, ruleCache, categoryNameToId);
    }
    for (const tx of modified) {
      await applyAddedOrModified(item.userId, tx, accountByPlaidId, ruleCache, categoryNameToId);
    }
    await removeTransactions(removed);

    cursor = next_cursor;
    hasMore = has_more;
  }

  await prisma.financePlaidItem.update({
    where: { id: item.id },
    data: {
      cursor: cursor ?? null,
      lastSyncedAt: new Date(),
      status: "active",
    },
  });

  return { ok: true as const };
}

export async function syncPlaidItemByPlaidItemId(plaidItemId: string) {
  const item = await prisma.financePlaidItem.findUnique({ where: { itemId: plaidItemId } });
  if (!item) return { ok: false as const, error: "Item not found" };
  await syncPlaidItem(item.id);
  return { ok: true as const };
}
