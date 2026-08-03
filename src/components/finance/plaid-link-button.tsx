"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { GlassButton } from "@/components/ui/glass-button";

type Props = {
  onLinked?: () => void;
  label?: string;
};

export function PlaidLinkButton({ onLinked, label = "Connect bank" }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchToken = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/finance/plaid/create-link-token", { method: "POST" });
      const data = (await res.json()) as { link_token?: string; error?: string; hint?: string; env?: string };
      if (!res.ok || !data.link_token) {
        const parts = [data.error ?? "Could not start Plaid Link."];
        if (data.env) parts.push(`(env: ${data.env})`);
        if (data.hint) parts.push(data.hint);
        throw new Error(parts.join(" "));
      }
      setToken(data.link_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Plaid Link.");
      setToken(null);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void fetchToken();
    }, 0);
    return () => window.clearTimeout(t);
  }, [fetchToken]);

  const { open, ready } = usePlaidLink({
    token,
    onSuccess: async (publicToken, metadata) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/finance/plaid/exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution
              ? {
                  institution_id: metadata.institution.institution_id,
                  name: metadata.institution.name,
                }
              : null,
          }),
        });
        const data = (await res.json()) as { error?: string; warning?: string };
        if (!res.ok) throw new Error(data.error ?? "Could not link account.");
        if (data.warning) setError(data.warning);
        onLinked?.();
        void fetchToken();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not link account.");
      } finally {
        setBusy(false);
      }
    },
    onExit: () => {
      void fetchToken();
    },
  });

  return (
    <div className="grid gap-2">
      <GlassButton
        variant="primary"
        disabled={!ready || !token || busy}
        onClick={() => open()}
      >
        {busy ? "Working…" : label}
      </GlassButton>
      {error ? <p className="text-sm text-copper">{error}</p> : null}
    </div>
  );
}
