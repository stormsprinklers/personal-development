import { NextResponse } from "next/server";
import { AccountabilityLinkStatus } from "@prisma/client";
import { isValidAccountabilityCode, normalizeAccountabilityCode } from "@/lib/auth/accountability-code";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RequestBody = {
  code?: string;
  fromShares?: boolean;
  toShares?: boolean;
};

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const code = normalizeAccountabilityCode(body.code ?? "");
  const fromShares = body.fromShares === true;
  const toShares = body.toShares === true;

  if (!isValidAccountabilityCode(code)) {
    return NextResponse.json({ error: "Enter a valid partner code." }, { status: 400 });
  }
  if (!fromShares && !toShares) {
    return NextResponse.json({ error: "Select at least one sharing option." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { accountabilityCode: code } });
  if (!target) {
    return NextResponse.json({ error: "No user found with that code." }, { status: 404 });
  }
  if (target.id === auth.session.userId) {
    return NextResponse.json({ error: "You cannot add yourself as a partner." }, { status: 400 });
  }

  const existing = await prisma.accountabilityLink.findFirst({
    where: {
      OR: [
        { fromUserId: auth.session.userId, toUserId: target.id },
        { fromUserId: target.id, toUserId: auth.session.userId },
      ],
      status: { in: [AccountabilityLinkStatus.pending, AccountabilityLinkStatus.active] },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "A pending or active link already exists with this user." }, { status: 409 });
  }

  const endedLinks = await prisma.accountabilityLink.findMany({
    where: {
      OR: [
        { fromUserId: auth.session.userId, toUserId: target.id },
        { fromUserId: target.id, toUserId: auth.session.userId },
      ],
      status: { in: [AccountabilityLinkStatus.revoked, AccountabilityLinkStatus.rejected] },
    },
  });

  const reusableLink = endedLinks.find(
    (row) => row.fromUserId === auth.session.userId && row.toUserId === target.id,
  );

  if (reusableLink) {
    const link = await prisma.accountabilityLink.update({
      where: { id: reusableLink.id },
      data: {
        status: AccountabilityLinkStatus.pending,
        fromShares,
        toShares,
        initiatedByUserId: auth.session.userId,
      },
    });
    return NextResponse.json({ linkId: link.id, status: link.status });
  }

  if (endedLinks.length) {
    await prisma.accountabilityLink.deleteMany({
      where: { id: { in: endedLinks.map((row) => row.id) } },
    });
  }

  const link = await prisma.accountabilityLink.create({
    data: {
      fromUserId: auth.session.userId,
      toUserId: target.id,
      initiatedByUserId: auth.session.userId,
      status: AccountabilityLinkStatus.pending,
      fromShares,
      toShares,
    },
  });

  return NextResponse.json({ linkId: link.id, status: link.status });
}
