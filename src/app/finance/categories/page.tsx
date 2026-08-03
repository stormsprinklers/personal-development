"use client";

import { useCallback, useEffect, useState } from "react";
import { FinanceShell } from "@/components/finance/finance-shell";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";

type Category = { id: string; name: string; kind: string; isSystem: boolean };
type Rule = {
  id: string;
  merchantName: string;
  categoryName: string;
  flowType: string | null;
};

export default function FinanceCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const [cRes, rRes] = await Promise.all([
      fetch("/api/finance/categories"),
      fetch("/api/finance/merchants/rules"),
    ]);
    const cData = (await cRes.json()) as { categories?: Category[]; error?: string };
    const rData = (await rRes.json()) as { rules?: Rule[]; error?: string };
    if (!cRes.ok) setError(cData.error ?? "Could not load categories.");
    else setCategories(cData.categories ?? []);
    if (!rRes.ok) setError(rData.error ?? "Could not load rules.");
    else setRules(rData.rules ?? []);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  async function addCategory() {
    const name = newName.trim();
    if (!name) return;
    const res = await fetch("/api/finance/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind: "expense" }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Could not create category.");
      return;
    }
    setNewName("");
    await refresh();
  }

  async function deleteCategory(id: string) {
    if (!window.confirm("Delete this category? Transactions move to Uncategorized.")) return;
    const res = await fetch(`/api/finance/categories?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Could not delete.");
      return;
    }
    await refresh();
  }

  async function deleteRule(id: string) {
    if (!window.confirm("Delete this merchant rule?")) return;
    const res = await fetch(`/api/finance/merchants/rules?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Could not delete rule.");
      return;
    }
    await refresh();
  }

  return (
    <FinanceShell title="Categories & rules" description="Manage categories and merchant auto-rules.">
      <div className="grid gap-5">
        {error ? <p className="text-sm text-copper">{error}</p> : null}

        <SectionCard title="Categories" inset={false}>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addCategory();
                }
              }}
              placeholder="New category name…"
              className="ios-field min-w-0 flex-1 px-3 py-2.5 text-sm"
            />
            <GlassButton variant="primary" disabled={!newName.trim()} onClick={() => void addCategory()}>
              Add
            </GlassButton>
          </div>
          <ul className="grid gap-2">
            {categories.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-ios-fill/40 px-3 py-2 text-sm"
              >
                <span>
                  {c.name}
                  <span className="text-ios-secondary"> · {c.kind}</span>
                  {c.isSystem ? <span className="text-ios-secondary"> · system</span> : null}
                </span>
                {!c.isSystem ? (
                  <GlassButton variant="secondary" onClick={() => void deleteCategory(c.id)}>
                    Delete
                  </GlassButton>
                ) : null}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Merchant rules" inset={false}>
          {!rules.length ? (
            <p className="text-sm text-ios-secondary">
              No rules yet. When you recategorize a transaction, choose “Yes, apply to all” to create
              one.
            </p>
          ) : (
            <ul className="grid gap-2">
              {rules.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-ios-fill/40 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{r.merchantName}</span>
                    <span className="text-ios-secondary"> → {r.categoryName}</span>
                    {r.flowType ? (
                      <span className="text-ios-secondary"> ({r.flowType})</span>
                    ) : null}
                  </span>
                  <GlassButton variant="secondary" onClick={() => void deleteRule(r.id)}>
                    Delete
                  </GlassButton>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </FinanceShell>
  );
}
