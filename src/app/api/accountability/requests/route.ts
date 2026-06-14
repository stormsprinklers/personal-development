import { NextResponse } from "next/server";
import { AccountabilityLinkStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const userId = auth.session.userId;

  const links = await prisma.accountabilityLink.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
      status: { in: [AccountabilityLinkStatus.pending, AccountabilityLinkStatus.active, AccountabilityLinkStatus.rejected] },
    },
    include: {
      fromUser: { select: { id: true, displayName: true, accountabilityCode: true } },
      toUser: { select: { id: true, displayName: true, accountabilityCode: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const incoming = links
    .filter((l) => l.toUserId === userId && l.status === AccountabilityLinkStatus.pending)
    .map(formatLink);
  const outgoing = links
    .filter((l) => l.fromUserId === userId && l.status === AccountabilityLinkStatus.pending)
    .map(formatLink);
  const active = links.filter((l) => l.status === AccountabilityLinkStatus.active).map(formatLink);

  return NextResponse.json({ incoming, outgoing, active });
}

function formatLink(link: {
  id: string;
  fromUserId: string;
  toUserId: string;
  status: AccountabilityLinkStatus;
  fromShares: boolean;
  toShares: boolean;
  initiatedByUserId: string;
  fromUser: { id: string; displayName: string; accountabilityCode: string };
  toUser: { id: string; displayName: string; accountabilityCode: string };
}) {
  return {
    id: link.id,
    status: link.status,
    fromShares: link.fromShares,
    toShares: link.toShares,
    initiatedByUserId: link.initiatedByUserId,
    fromUser: link.fromUser,
    toUser: link.toUser,
  };
}
