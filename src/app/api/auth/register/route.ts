import { NextResponse } from "next/server";
import { createUniqueAccountabilityCode, resolveInitialUserPayload } from "@/lib/auth/legacy-migration";
import { redeemAccountabilityInvite, getAccountabilityInvitePreview } from "@/lib/accountability/invite";
import { hashPassword, validateEmail, validatePassword } from "@/lib/auth/password";
import { ensureRecoveryAccount, isRecoveryAccountCredentials } from "@/lib/auth/recovery-account";
import { databaseConfigured } from "@/lib/auth/require-session";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RegisterBody = {
  email?: string;
  password?: string;
  displayName?: string;
  localPayload?: unknown;
  legacySyncKey?: string;
  inviteId?: string;
};

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";
  const displayName = body.displayName?.trim() ?? "";

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (isRecoveryAccountCredentials(email, password)) {
    const user = await ensureRecoveryAccount();
    return createAuthenticatedResponse(user);
  }

  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  if (!displayName) return NextResponse.json({ error: "Display name is required." }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const inviteId = body.inviteId?.trim();
  if (inviteId) {
    const preview = await getAccountabilityInvitePreview(inviteId);
    if (!preview.valid) {
      return NextResponse.json({ error: preview.error ?? "Invalid invite." }, { status: 400 });
    }
  }

  const passwordHash = await hashPassword(password);
  const accountabilityCode = await createUniqueAccountabilityCode();
  const payload = await resolveInitialUserPayload({
    localPayload: body.localPayload,
    legacySyncKey: body.legacySyncKey,
    displayName,
  });

  const legacyKey = body.legacySyncKey?.trim() || null;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName,
      accountabilityCode,
      appData: {
        create: {
          payload: payload as object,
          legacySyncKey: legacyKey,
        },
      },
    },
  });

  if (inviteId) {
    const redeemed = await redeemAccountabilityInvite(inviteId, user.id);
    if (!redeemed.ok) {
      await prisma.user.delete({ where: { id: user.id } });
      return NextResponse.json({ error: redeemed.error }, { status: 400 });
    }
  }

  return createAuthenticatedResponse(user);
}

async function createAuthenticatedResponse(user: {
  id: string;
  email: string;
  displayName: string;
  accountabilityCode: string;
}) {
  const token = await createSessionToken({ userId: user.id, email: user.email });
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      accountabilityCode: user.accountabilityCode,
    },
  });
  response.cookies.set(sessionCookieOptions(token));
  return response;
}
