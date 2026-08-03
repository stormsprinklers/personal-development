"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GlassButton } from "@/components/ui/glass-button";
import { Sheet } from "@/components/ui/sheet";

export type FinanceTxn = {
  id: string;
  date: string;
  merchant: string | null;
  merchantId: string | null;
  description: string;
  amount: number;
  account: { id: string; name: string; mask: string | null; type: string };
  pending: boolean;
  category: { id: string; name: string; kind?: string } | null;
  flowType: string;
  reviewStatus: string;
};

type Category = { id: string; name: string };
type Account = { id: string; name: string; mask: string | null };

function formatMoney(amount: number) {
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString(undefined, { style: "currency", currency: "USD" });
  // Plaid: positive = money out
  return amount > 0 ? `−${formatted}` : amount < 0 ? `+${formatted}` : formatted;
}

export function TransactionFeed() {
  const [transactions, setTransactions] = useState<FinanceTxn[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [flowType, setFlowType] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  const [pending, setPending] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");

  const [editTxn, setEditTxn] = useState<FinanceTxn | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [pendingApply, setPendingApply] = useState<{
    txnId: string;
    categoryId: string;
    merchantLabel: string;
  } | null>(null);

  const pageSize = 50;

  const loadMeta = useCallback(async () => {
    const [catRes, acctRes] = await Promise.all([
      fetch("/api/finance/categories"),
      fetch("/api/finance/accounts"),
    ]);
    const catData = (await catRes.json()) as { categories?: Category[] };
    const acctData = (await acctRes.json()) as {
      items?: Array<{ accounts: Account[] }>;
    };
    setCategories(catData.categories ?? []);
    setAccounts((acctData.items ?? []).flatMap((i) => i.accounts));
  }, []);

  const loadTxns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (q.trim()) params.set("q", q.trim());
      if (accountId) params.set("accountId", accountId);
      if (categoryId) params.set("categoryId", categoryId);
      if (flowType) params.set("flowType", flowType);
      if (reviewStatus) params.set("reviewStatus", reviewStatus);
      if (pending) params.set("pending", pending);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/finance/transactions?${params}`);
      const data = (await res.json()) as {
        transactions?: FinanceTxn[];
        total?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load transactions.");
      setTransactions(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [page, q, accountId, categoryId, flowType, reviewStatus, pending, from, to]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadMeta();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadMeta]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadTxns();
    }, 0);
    return () => window.clearTimeout(t);
  }, [loadTxns]);

  const allSelected = useMemo(
    () => transactions.length > 0 && transactions.every((t) => selected.has(t.id)),
    [transactions, selected],
  );

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(transactions.map((t) => t.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyCategory(txnId: string, nextCategoryId: string, applyToMerchant: boolean) {
    const res = await fetch(`/api/finance/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId: nextCategoryId,
        reviewStatus: "reviewed",
        applyToMerchant,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Update failed.");
    }
    await loadTxns();
  }

  function openEdit(txn: FinanceTxn) {
    setEditTxn(txn);
    setEditCategoryId(txn.category?.id ?? "");
  }

  async function saveEdit() {
    if (!editTxn || !editCategoryId) return;
    if (editTxn.merchantId || editTxn.merchant) {
      setPendingApply({
        txnId: editTxn.id,
        categoryId: editCategoryId,
        merchantLabel: editTxn.merchant ?? "this merchant",
      });
      setEditTxn(null);
      return;
    }
    await applyCategory(editTxn.id, editCategoryId, false);
    setEditTxn(null);
  }

  async function confirmApplyMerchant(yes: boolean) {
    if (!pendingApply) return;
    try {
      await applyCategory(pendingApply.txnId, pendingApply.categoryId, yes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setPendingApply(null);
    }
  }

  async function runBulk() {
    if (!selected.size || !bulkCategoryId) return;
    const ids = [...selected];
    const hasMerchant = transactions.some((t) => selected.has(t.id) && (t.merchantId || t.merchant));
    let applyToMerchant = false;
    if (hasMerchant) {
      applyToMerchant = window.confirm(
        "Apply this category to all transactions from these merchants (past and future)?",
      );
    }
    const res = await fetch("/api/finance/transactions/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids,
        categoryId: bulkCategoryId,
        reviewStatus: "reviewed",
        applyToMerchant,
      }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Bulk update failed.");
      return;
    }
    setSelected(new Set());
    setBulkCategoryId("");
    await loadTxns();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="grid gap-4">
      <div className="ios-card grid gap-3 p-4">
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search merchant or description…"
          className="ios-field w-full px-3 py-2.5 text-sm"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={accountId}
            onChange={(e) => {
              setPage(1);
              setAccountId(e.target.value);
            }}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {a.mask ? ` ···${a.mask}` : ""}
              </option>
            ))}
          </select>
          <select
            value={categoryId}
            onChange={(e) => {
              setPage(1);
              setCategoryId(e.target.value);
            }}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={flowType}
            onChange={(e) => {
              setPage(1);
              setFlowType(e.target.value);
            }}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
            <option value="cc_payment">CC payment</option>
            <option value="other">Other</option>
          </select>
          <select
            value={reviewStatus}
            onChange={(e) => {
              setPage(1);
              setReviewStatus(e.target.value);
            }}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="">All review statuses</option>
            <option value="needs_review">Needs review</option>
            <option value="reviewed">Reviewed</option>
          </select>
          <select
            value={pending}
            onChange={(e) => {
              setPage(1);
              setPending(e.target.value);
            }}
            className="ios-field px-3 py-2.5 text-sm"
          >
            <option value="">Pending & posted</option>
            <option value="true">Pending only</option>
            <option value="false">Posted only</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPage(1);
                setFrom(e.target.value);
              }}
              className="ios-field min-w-0 flex-1 px-2 py-2.5 text-sm"
              aria-label="From date"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPage(1);
                setTo(e.target.value);
              }}
              className="ios-field min-w-0 flex-1 px-2 py-2.5 text-sm"
              aria-label="To date"
            />
          </div>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="ios-card flex flex-wrap items-end gap-2 p-4">
          <p className="w-full text-sm text-ios-secondary">{selected.size} selected</p>
          <select
            value={bulkCategoryId}
            onChange={(e) => setBulkCategoryId(e.target.value)}
            className="ios-field min-w-[10rem] flex-1 px-3 py-2.5 text-sm"
          >
            <option value="">Set category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <GlassButton variant="primary" disabled={!bulkCategoryId} onClick={() => void runBulk()}>
            Apply
          </GlassButton>
          <GlassButton variant="secondary" onClick={() => setSelected(new Set())}>
            Clear
          </GlassButton>
        </div>
      ) : null}

      {error ? <p className="text-sm text-copper">{error}</p> : null}
      {loading ? <p className="text-sm text-ios-secondary">Loading…</p> : null}

      <div className="ios-card overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ios-separator text-xs uppercase tracking-wide text-ios-secondary">
              <th className="px-3 py-2">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all" />
              </th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Account</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Review</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-ios-separator/60 align-top">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleOne(t.id)}
                    aria-label={`Select ${t.description}`}
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2">{t.date}</td>
                <td className="px-3 py-2">{t.merchant ?? "—"}</td>
                <td className="max-w-[10rem] truncate px-3 py-2" title={t.description}>
                  {t.description}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right font-medium">{formatMoney(t.amount)}</td>
                <td className="px-3 py-2">
                  {t.account.name}
                  {t.account.mask ? ` ···${t.account.mask}` : ""}
                </td>
                <td className="px-3 py-2">{t.pending ? "Pending" : "Posted"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-left font-medium text-ios-label underline-offset-2 hover:underline"
                    onClick={() => openEdit(t)}
                  >
                    {t.category?.name ?? "Uncategorized"}
                  </button>
                  <div className="text-xs text-ios-secondary">{t.flowType.replace("_", " ")}</div>
                </td>
                <td className="px-3 py-2 text-xs">
                  {t.reviewStatus === "reviewed" ? "Reviewed" : "Needs review"}
                </td>
              </tr>
            ))}
            {!loading && !transactions.length ? (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-ios-secondary">
                  No transactions match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ios-secondary">
          {total} total · page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <GlassButton
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </GlassButton>
          <GlassButton
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </GlassButton>
        </div>
      </div>

      <Sheet
        open={Boolean(editTxn)}
        onClose={() => setEditTxn(null)}
        title="Edit category"
        footer={
          <div className="flex gap-2">
            <GlassButton variant="secondary" className="flex-1" onClick={() => setEditTxn(null)}>
              Cancel
            </GlassButton>
            <GlassButton
              variant="primary"
              className="flex-1"
              disabled={!editCategoryId}
              onClick={() => void saveEdit()}
            >
              Save
            </GlassButton>
          </div>
        }
      >
        {editTxn ? (
          <div className="grid gap-3">
            <p className="text-sm text-ios-secondary">
              {editTxn.merchant ?? editTxn.description} · {formatMoney(editTxn.amount)}
            </p>
            <label className="grid gap-1 text-sm font-medium">
              Category
              <select
                value={editCategoryId}
                onChange={(e) => setEditCategoryId(e.target.value)}
                className="ios-field px-3 py-2.5 text-sm"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(pendingApply)}
        onClose={() => {
          if (pendingApply) void confirmApplyMerchant(false);
        }}
        title="Apply to merchant?"
        footer={
          <div className="flex gap-2">
            <GlassButton
              variant="secondary"
              className="flex-1"
              onClick={() => void confirmApplyMerchant(false)}
            >
              No, just this one
            </GlassButton>
            <GlassButton
              variant="primary"
              className="flex-1"
              onClick={() => void confirmApplyMerchant(true)}
            >
              Yes, apply to all
            </GlassButton>
          </div>
        }
      >
        {pendingApply ? (
          <p className="text-sm text-ios-label">
            Apply this category to all transactions from{" "}
            <span className="font-semibold">{pendingApply.merchantLabel}</span>? This updates past
            transactions and creates a rule for future ones.
          </p>
        ) : null}
      </Sheet>
    </div>
  );
}
