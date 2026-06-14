import { NextResponse } from "next/server";
import { AccountabilityLinkStatus } from "@prisma/client";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RespondBody = {
  action?: "accept" | "reject";
  /** When accepting, whether you share your progress back (toShares on the link). */
  shareBack?: boolean;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  let body: RespondBody;
  try {
    body = (await request.json()) as RespondBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action;
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "action must be accept or reject." }, { status: 400 });
  }

  const link = await prisma.accountabilityLink.findUnique({ where: { id } });
  if (!link) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const userId = auth.session.userId;

  if (link.status !== AccountabilityLinkStatus.pending) {
    return NextResponse.json({ error: "This request is no longer pending." }, { status: 400 });
  }

  if (action === "reject") {
    if (link.toUserId !== userId && link.fromUserId !== userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    await prisma.accountabilityLink.update({
      where: { id },
      data: { status: AccountabilityLinkStatus.rejected },
    });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  // Accept: recipient (toUser) confirms; may enable share-back (toShares)
  if (link.toUserId !== userId) {
    return NextResponse.json({ error: "Only the recipient can accept this request." }, { status: 403 });
  }

  const shareBack = body.shareBack === true;
  await prisma.accountabilityLink.update({
    where: { id },
    data: {
      status: AccountabilityLinkStatus.active,
      toShares: shareBack,
    },
  });

  return NextResponse.json({ ok: true, status: "active" });
}
