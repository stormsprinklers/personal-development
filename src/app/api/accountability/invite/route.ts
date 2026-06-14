import { NextResponse } from "next/server";
import {
  accountabilityInviteExpiresAt,
  buildAccountabilityInviteUrl,
} from "@/lib/accountability/invite";
import { requireSession } from "@/lib/auth/require-session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type InviteBody = {
  fromShares?: boolean;
  toShares?: boolean;
};

function requestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  let body: InviteBody;
  try {
    body = (await request.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fromShares = body.fromShares === true;
  const toShares = body.toShares === true;

  if (!fromShares && !toShares) {
    return NextResponse.json({ error: "Select at least one sharing option." }, { status: 400 });
  }

  const invite = await prisma.accountabilityInvite.create({
    data: {
      inviterUserId: auth.session.userId,
      fromShares,
      toShares,
      expiresAt: accountabilityInviteExpiresAt(),
    },
  });

  const url = buildAccountabilityInviteUrl(requestOrigin(request), invite.id);

  return NextResponse.json({
    inviteId: invite.id,
    url,
    expiresAt: invite.expiresAt.toISOString(),
  });
}
