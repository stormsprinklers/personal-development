import { AccountabilityLinkStatus } from "@prisma/client";
import { upsertAccountabilityLink } from "@/lib/accountability/upsert-link";
import { prisma } from "@/lib/prisma";

export const ACCOUNTABILITY_INVITE_VALID_DAYS = 30;

export function accountabilityInviteExpiresAt(from: Date = new Date()) {
  return new Date(from.getTime() + ACCOUNTABILITY_INVITE_VALID_DAYS * 24 * 60 * 60 * 1000);
}

export function buildAccountabilityInviteUrl(origin: string, inviteId: string) {
  const base = origin.replace(/\/$/, "");
  return `${base}/?invite=${encodeURIComponent(inviteId)}`;
}

export type InvitePreview = {
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  inviterName?: string;
  fromShares?: boolean;
  toShares?: boolean;
  error?: string;
};

export async function getAccountabilityInvitePreview(inviteId: string): Promise<InvitePreview> {
  const invite = await prisma.accountabilityInvite.findUnique({
    where: { id: inviteId },
    include: { inviter: { select: { displayName: true } } },
  });

  if (!invite) {
    return { valid: false, error: "Invite not found." };
  }
  if (invite.usedAt) {
    return { valid: false, used: true, error: "This invite has already been used." };
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { valid: false, expired: true, error: "This invite has expired." };
  }

  return {
    valid: true,
    inviterName: invite.inviter.displayName,
    fromShares: invite.fromShares,
    toShares: invite.toShares,
  };
}

export async function redeemAccountabilityInvite(inviteId: string, newUserId: string) {
  const invite = await prisma.accountabilityInvite.findUnique({
    where: { id: inviteId },
  });

  if (!invite) {
    return { ok: false as const, error: "Invalid invite." };
  }
  if (invite.usedAt) {
    return { ok: false as const, error: "This invite has already been used." };
  }
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false as const, error: "This invite has expired." };
  }
  if (invite.inviterUserId === newUserId) {
    return { ok: false as const, error: "You cannot use your own invite." };
  }
  if (!invite.fromShares && !invite.toShares) {
    return { ok: false as const, error: "Invite is misconfigured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.accountabilityInvite.findUnique({ where: { id: inviteId } });
      if (!current || current.usedAt || current.expiresAt.getTime() <= Date.now()) {
        throw new Error("Invite is no longer valid.");
      }

      await upsertAccountabilityLink(
        {
          fromUserId: invite.inviterUserId,
          toUserId: newUserId,
          initiatedByUserId: invite.inviterUserId,
          fromShares: invite.fromShares,
          toShares: invite.toShares,
          status: AccountabilityLinkStatus.active,
        },
        tx,
      );

      await tx.accountabilityInvite.update({
        where: { id: inviteId },
        data: { usedAt: new Date(), usedByUserId: newUserId },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not link accountability partner.";
    return { ok: false as const, error: message };
  }

  return { ok: true as const };
}
