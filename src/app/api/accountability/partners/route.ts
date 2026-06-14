import { NextResponse } from "next/server";
import { getPartnersSharingWith } from "@/lib/accountability/access";
import { requireSession } from "@/lib/auth/require-session";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireSession();
  if (!auth.ok) return auth.response;

  const partners = await getPartnersSharingWith(auth.session.userId);
  return NextResponse.json({ partners });
}
