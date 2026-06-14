import { NextResponse } from "next/server";
import { verifyPassword, validateEmail } from "@/lib/auth/password";
import { databaseConfigured } from "@/lib/auth/require-session";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!databaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured on the server." }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const password = body.password ?? "";

  if (!validateEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

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
