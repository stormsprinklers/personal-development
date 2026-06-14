"use client";

import { useCallback, useEffect, useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import {
  ACCOUNTABILITY_SHARED_ITEMS,
  describeActiveLink,
  describeIncomingRequest,
  describeOutgoingRequest,
} from "@/lib/accountability/link-copy";
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

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T }> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const text = await response.text();
  if (!text.trim()) {
    return {
      ok: response.ok,
      data: {} as T,
    };
  }
  try {
    return { ok: response.ok, data: JSON.parse(text) as T };
  } catch {
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }
}

function IncomingRequestRow({
  link,
  busy,
  onRespond,
}: {
  link: AccountabilityLinkRow;
  busy: boolean;
  onRespond: (
    linkId: string,
    action: "accept" | "reject",
    grants?: { allowThemToSeeMine: boolean; allowTheirShareWithMe: boolean },
  ) => void;
}) {
  const { requesterName, wantsToSeeYours, wantsToShareWithYou } = describeIncomingRequest(link);
  const [allowThemToSeeMine, setAllowThemToSeeMine] = useState(wantsToSeeYours);
  const [allowTheirShareWithMe, setAllowTheirShareWithMe] = useState(wantsToShareWithYou);

  useEffect(() => {
    setAllowThemToSeeMine(wantsToSeeYours);
    setAllowTheirShareWithMe(wantsToShareWithYou);
  }, [link.id, wantsToSeeYours, wantsToShareWithYou]);

  const canAccept = allowThemToSeeMine || allowTheirShareWithMe;

  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium text-ios-label">{requesterName}</p>
      <p className="mt-1 text-xs text-ios-secondary">Requested access:</p>
      <ul className="mt-1 list-inside list-disc text-xs text-ios-secondary">
        {wantsToSeeYours ? (
          <li>
            Wants to see your {ACCOUNTABILITY_SHARED_ITEMS}
          </li>
        ) : null}
        {wantsToShareWithYou ? (
          <li>
            Wants to share their {ACCOUNTABILITY_SHARED_ITEMS} with you
          </li>
        ) : null}
        {!wantsToSeeYours && !wantsToShareWithYou ? <li>No specific access requested</li> : null}
      </ul>

      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-ios-secondary">You allow</p>
      <div className="mt-2 grid gap-2">
        {wantsToSeeYours ? (
          <label className="flex items-start gap-2 text-sm text-ios-label">
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={allowThemToSeeMine}
              onChange={(e) => setAllowThemToSeeMine(e.target.checked)}
            />
            <span>
              {requesterName} can see my {ACCOUNTABILITY_SHARED_ITEMS}
            </span>
          </label>
        ) : null}
        {wantsToShareWithYou ? (
          <label className="flex items-start gap-2 text-sm text-ios-label">
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={allowTheirShareWithMe}
              onChange={(e) => setAllowTheirShareWithMe(e.target.checked)}
            />
            <span>
              I can see {requesterName}&apos;s {ACCOUNTABILITY_SHARED_ITEMS}
            </span>
          </label>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <GlassButton
          variant="primary"
          className="min-h-9 px-3 py-1 text-xs"
          disabled={busy || !canAccept}
          onClick={() =>
            onRespond(link.id, "accept", {
              allowThemToSeeMine: wantsToSeeYours ? allowThemToSeeMine : false,
              allowTheirShareWithMe: wantsToShareWithYou ? allowTheirShareWithMe : false,
            })
          }
        >
          Accept selected
        </GlassButton>
        <GlassButton
          variant="destructive"
          className="min-h-9 px-3 py-1 text-xs"
          disabled={busy}
          onClick={() => onRespond(link.id, "reject")}
        >
          Decline
        </GlassButton>
      </div>
      {!canAccept ? (
        <p className="mt-2 text-xs text-ios-secondary">Select at least one permission to accept.</p>
      ) : null}
    </div>
  );
}

export function AccountabilitySettingsPanel() {
  const { user } = useAuth();
  const [codeInput, setCodeInput] = useState("");
  const [shareMine, setShareMine] = useState(true);
  const [seeTheirs, setSeeTheirs] = useState(true);
  const [incoming, setIncoming] = useState<AccountabilityLinkRow[]>([]);
  const [outgoing, setOutgoing] = useState<AccountabilityLinkRow[]>([]);
  const [active, setActive] = useState<AccountabilityLinkRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [reqRes, partnersRes] = await Promise.all([
        fetchJson<{
          incoming?: AccountabilityLinkRow[];
          outgoing?: AccountabilityLinkRow[];
          active?: AccountabilityLinkRow[];
          error?: string;
        }>("/api/accountability/requests"),
        fetchJson<{ partners?: PartnerRow[]; error?: string }>("/api/accountability/partners"),
      ]);

      if (!reqRes.ok) {
        throw new Error(reqRes.data.error ?? "Could not load accountability requests.");
      }
      if (!partnersRes.ok) {
        throw new Error(partnersRes.data.error ?? "Could not load partners.");
      }

      setIncoming(reqRes.data.incoming ?? []);
      setOutgoing(reqRes.data.outgoing ?? []);
      setActive(reqRes.data.active ?? []);
      setPartners(partnersRes.data.partners ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load accountability settings.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function sendRequest() {
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await fetchJson<{ error?: string }>("/api/accountability/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeInput, fromShares: shareMine, toShares: seeTheirs }),
      });
      if (!ok) throw new Error(data.error ?? "Could not send request.");
      setCodeInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(
    linkId: string,
    action: "accept" | "reject",
    grants?: { allowThemToSeeMine: boolean; allowTheirShareWithMe: boolean },
  ) {
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await fetchJson<{ error?: string }>(`/api/accountability/requests/${linkId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "accept"
            ? {
                action,
                allowThemToSeeMine: grants?.allowThemToSeeMine ?? false,
                allowTheirShareWithMe: grants?.allowTheirShareWithMe ?? false,
              }
            : { action },
        ),
      });
      if (!ok) throw new Error(data.error ?? "Could not update request.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(linkId: string) {
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await fetchJson<{ error?: string }>(`/api/accountability/links/${linkId}`, {
        method: "DELETE",
      });
      if (!ok) throw new Error(data.error ?? "Could not remove partner.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Remove failed.");
    } finally {
      setBusy(false);
    }
  }

  function partnerLabel(link: AccountabilityLinkRow) {
    if (!user) return "Partner";
    return link.fromUser.id === user.id ? link.toUser.displayName : link.fromUser.displayName;
  }

  if (loading) {
    return <p className="text-sm text-ios-secondary">Loading accountability partners…</p>;
  }

  return (
    <>
      <SectionCard title="Your code" inset={false}>
        <div className="ios-card grid gap-3 p-4">
          <p className="text-sm text-ios-secondary">
            Share this code so others can connect with you. Partners can view {ACCOUNTABILITY_SHARED_ITEMS} only —
            not your journal or individual tasks.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="ios-card-muted rounded-lg px-4 py-2 text-lg font-semibold tracking-widest">
              {user?.accountabilityCode ?? "—"}
            </code>
            <GlassButton
              variant="secondary"
              disabled={!user?.accountabilityCode}
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
            placeholder="Partner code (6–12 characters)"
            className="ios-field px-3 py-2.5 text-sm uppercase tracking-wider"
            autoComplete="off"
            spellCheck={false}
          />
          <label className="flex items-start gap-2 text-sm text-ios-secondary">
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={shareMine}
              onChange={(e) => setShareMine(e.target.checked)}
            />
            <span>Share my {ACCOUNTABILITY_SHARED_ITEMS} with them</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-ios-secondary">
            <input
              type="checkbox"
              className="mt-0.5 shrink-0"
              checked={seeTheirs}
              onChange={(e) => setSeeTheirs(e.target.checked)}
            />
            <span>Ask to see their {ACCOUNTABILITY_SHARED_ITEMS}</span>
          </label>
          <p className="text-xs text-ios-secondary">
            They will see exactly what you request and choose which permissions to grant.
          </p>
          <div className="flex flex-wrap gap-2">
            <GlassButton variant="primary" disabled={busy || !codeInput.trim()} onClick={() => void sendRequest()}>
              Send request
            </GlassButton>
            <GlassButton variant="secondary" disabled={busy} onClick={() => void load()}>
              Refresh
            </GlassButton>
          </div>
          {error ? <p className="text-sm text-copper">{error}</p> : null}
        </div>
      </SectionCard>

      {incoming.length ? (
        <SectionCard title="Incoming requests" inset={false}>
          <div className="ios-card overflow-hidden">
            {incoming.map((link, i) => (
              <div key={link.id} className={i < incoming.length - 1 ? "ios-hairline" : ""}>
                <IncomingRequestRow link={link} busy={busy} onRespond={(id, action, grants) => void respond(id, action, grants)} />
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
                <ul className="mt-1 list-inside list-disc text-xs text-ios-secondary">
                  {user
                    ? describeOutgoingRequest(link, user.id).map((line) => <li key={line}>{line}</li>)
                    : null}
                </ul>
                <p className="mt-1 text-xs text-ios-secondary">Pending their response</p>
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
              <ul className="mt-1 list-inside list-disc text-xs text-ios-secondary">
                {user ? describeActiveLink(link, user.id).map((line) => <li key={line}>{line}</li>) : null}
              </ul>
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
            <p className="px-4 py-3 text-sm text-ios-secondary">No active partners yet. Add someone by code above.</p>
          ) : null}
        </div>
      </SectionCard>

      {partners.length ? (
        <SectionCard title="Dashboard access" inset={false}>
          <div className="ios-card overflow-hidden">
            {partners.map((p, i) => (
              <div key={p.linkId} className={`px-4 py-3 ${i < partners.length - 1 ? "ios-hairline" : ""}`}>
                <p className="text-sm font-medium text-ios-label">{p.displayName}</p>
                <p className="text-xs text-ios-secondary">
                  {p.theyShareWithMe
                    ? `You can view their ${ACCOUNTABILITY_SHARED_ITEMS}`
                    : "They have not shared their progress with you"}
                  {p.iShareWithThem ? ` · They can view your ${ACCOUNTABILITY_SHARED_ITEMS}` : ""}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}
    </>
  );
}
