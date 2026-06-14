"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import { useAuth } from "@/lib/auth/auth-context";

type LinkUser = { id: string; displayName: string; accountabilityCode: string };

type AccountabilityLinkRow = {
  id: string;
  status: string;
  fromShares: boolean;
  toShares: boolean;
  initiatedByUserId: string;
  fromUser: LinkUser;
  toUser: LinkUser;
};

type PartnerRow = {
  linkId: string;
  userId: string;
  displayName: string;
  accountabilityCode: string;
  theyShareWithMe: boolean;
  iShareWithThem: boolean;
};

export function AccountabilitySettingsPanel() {
  const { user } = useAuth();
  const [codeInput, setCodeInput] = useState("");
  const [shareMine, setShareMine] = useState(true);
  const [seeTheirs, setSeeTheirs] = useState(true);
  const [incoming, setIncoming] = useState<AccountabilityLinkRow[]>([]);
  const [outgoing, setOutgoing] = useState<AccountabilityLinkRow[]>([]);
  const [active, setActive] = useState<AccountabilityLinkRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [reqRes, partnersRes] = await Promise.all([
      fetch("/api/accountability/requests", { cache: "no-store" }),
      fetch("/api/accountability/partners", { cache: "no-store" }),
    ]);
    const reqPayload = (await reqRes.json()) as {
      incoming?: AccountabilityLinkRow[];
      outgoing?: AccountabilityLinkRow[];
      active?: AccountabilityLinkRow[];
      error?: string;
    };
    const partnersPayload = (await partnersRes.json()) as { partners?: PartnerRow[]; error?: string };
    if (reqRes.ok) {
      setIncoming(reqPayload.incoming ?? []);
      setOutgoing(reqPayload.outgoing ?? []);
      setActive(reqPayload.active ?? []);
    }
    if (partnersRes.ok) setPartners(partnersPayload.partners ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendRequest() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/accountability/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput, fromShares: shareMine, toShares: seeTheirs }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not send request.");
      setCodeInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(linkId: string, action: "accept" | "reject", shareBack?: boolean) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/accountability/requests/${linkId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, shareBack }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update request.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(linkId: string) {
    setBusy(true);
    try {
      await fetch(`/api/accountability/links/${linkId}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function partnerLabel(link: AccountabilityLinkRow) {
    if (!user) return "";
    return link.fromUser.id === user.id ? link.toUser.displayName : link.fromUser.displayName;
  }

  function describeLink(link: AccountabilityLinkRow) {
    const parts: string[] = [];
    if (link.fromShares) parts.push(`${link.fromUser.displayName} shares with ${link.toUser.displayName}`);
    if (link.toShares) parts.push(`${link.toUser.displayName} shares with ${link.fromUser.displayName}`);
    return parts.length ? parts.join(" · ") : "No sharing enabled";
  }

  return (
    <>
      <SectionCard title="Your code" inset={false}>
        <div className="ios-card grid gap-3 p-4">
          <p className="text-sm text-ios-secondary">
            Share this code so others can connect with you. Partners see goals, habits, workouts, and AI summaries
            only — not your journal or individual tasks.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="ios-card-muted rounded-lg px-4 py-2 text-lg font-semibold tracking-widest">
              {user?.accountabilityCode ?? "—"}
            </code>
            <GlassButton
              variant="secondary"
              onClick={() => {
                if (!user?.accountabilityCode) return;
                void navigator.clipboard.writeText(user.accountabilityCode);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </GlassButton>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Add partner by code" inset={false}>
        <div className="ios-card grid gap-3 p-4">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="Partner code"
            className="ios-field px-3 py-2.5 text-sm uppercase tracking-wider"
          />
          <label className="flex items-center gap-2 text-sm text-ios-secondary">
            <input type="checkbox" checked={shareMine} onChange={(e) => setShareMine(e.target.checked)} />
            Share my progress with them
          </label>
          <label className="flex items-center gap-2 text-sm text-ios-secondary">
            <input type="checkbox" checked={seeTheirs} onChange={(e) => setSeeTheirs(e.target.checked)} />
            Request to see their progress
          </label>
          <GlassButton variant="primary" disabled={busy || !codeInput.trim()} onClick={() => void sendRequest()}>
            Send request
          </GlassButton>
          {error ? <p className="text-sm text-copper">{error}</p> : null}
        </div>
      </SectionCard>

      {incoming.length ? (
        <SectionCard title="Incoming requests" inset={false}>
          <div className="ios-card overflow-hidden">
            {incoming.map((link, i) => (
              <div key={link.id} className={`px-4 py-3 ${i < incoming.length - 1 ? "ios-hairline" : ""}`}>
                <p className="text-sm font-medium text-ios-label">{partnerLabel(link)}</p>
                <p className="text-xs text-ios-secondary">{describeLink(link)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <GlassButton
                    variant="primary"
                    className="min-h-9 px-3 py-1 text-xs"
                    disabled={busy}
                    onClick={() => void respond(link.id, "accept", true)}
                  >
                    Accept & share back
                  </GlassButton>
                  <GlassButton
                    variant="secondary"
                    className="min-h-9 px-3 py-1 text-xs"
                    disabled={busy}
                    onClick={() => void respond(link.id, "accept", false)}
                  >
                    Accept (don&apos;t share back)
                  </GlassButton>
                  <GlassButton
                    variant="destructive"
                    className="min-h-9 px-3 py-1 text-xs"
                    disabled={busy}
                    onClick={() => void respond(link.id, "reject")}
                  >
                    Decline
                  </GlassButton>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {outgoing.length ? (
        <SectionCard title="Outgoing requests" inset={false}>
          <div className="ios-card overflow-hidden">
            {outgoing.map((link, i) => (
              <div key={link.id} className={`px-4 py-3 ${i < outgoing.length - 1 ? "ios-hairline" : ""}`}>
                <p className="text-sm font-medium text-ios-label">{partnerLabel(link)}</p>
                <p className="text-xs text-ios-secondary">{describeLink(link)} · Pending</p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Active partners" inset={false}>
        <div className="ios-card overflow-hidden">
          {active.map((link, i) => (
            <div key={link.id} className={`px-4 py-3 ${i < active.length - 1 ? "ios-hairline" : ""}`}>
              <p className="text-sm font-medium text-ios-label">{partnerLabel(link)}</p>
              <p className="text-xs text-ios-secondary">{describeLink(link)}</p>
              <GlassButton
                variant="destructive"
                className="mt-2 min-h-9 px-2 py-1 text-xs"
                disabled={busy}
                onClick={() => void revoke(link.id)}
              >
                Remove
              </GlassButton>
            </div>
          ))}
          {!active.length ? (
            <p className="px-4 py-3 text-sm text-ios-secondary">No active partners yet.</p>
          ) : null}
        </div>
      </SectionCard>

      {partners.length ? (
        <SectionCard title="Sharing with you" inset={false}>
          <div className="ios-card overflow-hidden">
            {partners.map((p, i) => (
              <div key={p.linkId} className={`px-4 py-3 ${i < partners.length - 1 ? "ios-hairline" : ""}`}>
                <p className="text-sm font-medium text-ios-label">{p.displayName}</p>
                <p className="text-xs text-ios-secondary">
                  {p.theyShareWithMe ? "You can view their dashboard" : "Waiting for sharing"}
                  {p.iShareWithThem ? " · You share with them" : ""}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
