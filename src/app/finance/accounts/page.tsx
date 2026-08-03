"use client";

import { useCallback, useEffect, useState } from "react";
import { FinanceShell } from "@/components/finance/finance-shell";
import { PlaidLinkButton } from "@/components/finance/plaid-link-button";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";

type Account = {
  id: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  type: string;
  subtype: string | null;
};

type Item = {
  id: string;
  institutionName: string | null;
  status: string;
  lastSyncedAt: string | null;
  accounts: Account[];
};

export default function FinanceAccountsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [plaidConfigured, setPlaidConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/finance/accounts");
    const data = (await res.json()) as {
      items?: Item[];
      plaidConfigured?: boolean;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Could not load accounts.");
      return;
    }
    setItems(data.items ?? []);
    setPlaidConfigured(data.plaidConfigured !== false);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  async function syncItem(itemId: string) {
    setBusyId(itemId);
    try {
      await fetch("/api/finance/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(itemId: string) {
    if (!window.confirm("Disconnect this institution and remove its accounts/transactions?")) {
      return;
    }
    setBusyId(itemId);
    try {
      const res = await fetch(`/api/finance/accounts?itemId=${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Could not disconnect.");
        return;
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FinanceShell title="Accounts" description="Linked banks and cards via Plaid.">
      <div className="grid gap-5">
        <SectionCard title="Link" inset={false}>
          {!plaidConfigured ? (
            <p className="text-sm text-copper">
              Set PLAID_CLIENT_ID, PLAID_SECRET_KEY, and PLAID_ENV to connect accounts.
            </p>
          ) : (
            <PlaidLinkButton onLinked={() => void refresh()} label="Connect another institution" />
          )}
        </SectionCard>

        {error ? <p className="text-sm text-copper">{error}</p> : null}

        {!items.length ? (
          <p className="text-sm text-ios-secondary">No institutions linked yet.</p>
        ) : (
          items.map((item) => (
            <SectionCard
              key={item.id}
              title={item.institutionName ?? "Institution"}
              inset={false}
            >
              <p className="mb-2 text-sm text-ios-secondary">
                Status: {item.status}
                {item.lastSyncedAt
                  ? ` · Last sync ${new Date(item.lastSyncedAt).toLocaleString()}`
                  : ""}
              </p>
              <ul className="mb-3 grid gap-2">
                {item.accounts.map((a) => (
                  <li key={a.id} className="rounded-xl bg-ios-fill/40 px-3 py-2 text-sm">
                    <span className="font-medium">{a.name}</span>
                    {a.mask ? <span className="text-ios-secondary"> ···{a.mask}</span> : null}
                    <span className="text-ios-secondary">
                      {" "}
                      · {a.type}
                      {a.subtype ? `/${a.subtype}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <GlassButton
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void syncItem(item.id)}
                >
                  {busyId === item.id ? "Working…" : "Refresh"}
                </GlassButton>
                <GlassButton
                  variant="secondary"
                  disabled={busyId === item.id}
                  onClick={() => void removeItem(item.id)}
                >
                  Disconnect
                </GlassButton>
              </div>
            </SectionCard>
          ))
        )}
      </div>
    </FinanceShell>
  );
}
