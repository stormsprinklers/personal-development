"use client";

import { useState } from "react";
import { SectionCard } from "@/components/layout/section-card";
import { GlassButton } from "@/components/ui/glass-button";
import type { AccountabilityPartner } from "@/lib/models";
import { useAppData } from "@/lib/storage";

export function AccountabilitySettingsPanel() {
  const { data, setData } = useAppData();
  const partners = data.accountabilityPartners ?? [];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");

  function resetDraft() {
    setName("");
    setEmail("");
    setPhone("");
  }

  function addPartner() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName || !trimmedEmail) return;

    const partner: AccountabilityPartner = {
      id: crypto.randomUUID(),
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      createdAt: new Date().toISOString(),
    };

    setData((prev) => ({
      ...prev,
      accountabilityPartners: [...(prev.accountabilityPartners ?? []), partner],
    }));
    resetDraft();
  }

  function startEdit(partner: AccountabilityPartner) {
    setEditingId(partner.id);
    setEditName(partner.name);
    setEditEmail(partner.email);
    setEditPhone(partner.phone);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditEmail("");
    setEditPhone("");
  }

  function saveEdit() {
    if (!editingId || !editName.trim() || !editEmail.trim()) return;
    setData((prev) => ({
      ...prev,
      accountabilityPartners: (prev.accountabilityPartners ?? []).map((partner) =>
        partner.id === editingId
          ? {
              ...partner,
              name: editName.trim(),
              email: editEmail.trim(),
              phone: editPhone.trim(),
            }
          : partner,
      ),
    }));
    cancelEdit();
  }

  function removePartner(partnerId: string) {
    setData((prev) => ({
      ...prev,
      accountabilityPartners: (prev.accountabilityPartners ?? []).filter((partner) => partner.id !== partnerId),
    }));
    if (editingId === partnerId) cancelEdit();
  }

  return (
    <>
      <SectionCard title="About accountability" inset={false}>
        <p className="ios-card-muted p-4 text-sm text-ios-secondary">
          Add people who should receive automated updates on your habits, tasks, workouts, goals, and journal
          progress. Twilio SMS and email delivery will be wired up here later.
        </p>
      </SectionCard>

      <SectionCard title="Add partner" inset={false}>
        <div className="ios-card grid gap-3 p-4">
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Partner name"
              className="ios-field px-3 py-2.5 text-sm"
              autoComplete="name"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@example.com"
              className="ios-field px-3 py-2.5 text-sm"
              autoComplete="email"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium text-ios-secondary">
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              className="ios-field px-3 py-2.5 text-sm"
              autoComplete="tel"
            />
          </label>
          <GlassButton variant="primary" onClick={addPartner} disabled={!name.trim() || !email.trim()}>
            Add accountability partner
          </GlassButton>
        </div>
      </SectionCard>

      <SectionCard title="Partners" inset={false}>
        <div className="ios-card overflow-hidden">
          {partners.map((partner, index) => (
            <div
              key={partner.id}
              className={`px-4 py-3 ${index < partners.length - 1 ? "ios-hairline" : ""}`}
            >
              {editingId === partner.id ? (
                <div className="grid gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="ios-field px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="ios-field px-3 py-2 text-sm"
                  />
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone"
                    className="ios-field px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <GlassButton variant="primary" className="min-h-9 px-3 py-1 text-xs" onClick={saveEdit}>
                      Save
                    </GlassButton>
                    <GlassButton variant="secondary" className="min-h-9 px-3 py-1 text-xs" onClick={cancelEdit}>
                      Cancel
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ios-label">{partner.name}</p>
                    <p className="text-sm text-ios-secondary">{partner.email}</p>
                    {partner.phone ? (
                      <p className="text-sm text-ios-secondary">{partner.phone}</p>
                    ) : (
                      <p className="text-xs text-ios-secondary">No phone number</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <GlassButton
                      variant="secondary"
                      className="min-h-9 px-2 py-1 text-xs"
                      onClick={() => startEdit(partner)}
                    >
                      Edit
                    </GlassButton>
                    <GlassButton
                      variant="destructive"
                      className="min-h-9 px-2 py-1 text-xs"
                      onClick={() => {
                        if (window.confirm(`Remove accountability partner "${partner.name}"?`)) {
                          removePartner(partner.id);
                        }
                      }}
                    >
                      Remove
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>
          ))}
          {!partners.length ? (
            <p className="px-4 py-3 text-sm text-ios-secondary">No accountability partners yet.</p>
          ) : null}
        </div>
      </SectionCard>
    </>
  );
}
