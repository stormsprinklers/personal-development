import { NextResponse } from "next/server";
import { AccountabilityLinkStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const link = await prisma.accountabilityLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "Link not found." }, { status: 404 });
  }

  const userId = auth.session.userId;
  if (link.fromUserId !== userId && link.toUserId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await prisma.accountabilityLink.update({
    where: { id },
    data: { status: AccountabilityLinkStatus.revoked },
  });

  return NextResponse.json({ ok: true });
}
