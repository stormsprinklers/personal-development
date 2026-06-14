export const runtime = "nodejs";

import { mapOffProduct, OFF_USER_AGENT } from "@/lib/nutrition/off-mapper";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const barcode = code?.replace(/\D/g, "") ?? "";
  if (barcode.length < 8) {
    return Response.json({ error: "Invalid barcode." }, { status: 400 });
  }

  const url = `https://world.openfoodfacts.org/api/v3.6/product/${barcode}.json`;
  const response = await fetch(url, {
    headers: { "User-Agent": OFF_USER_AGENT },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    return Response.json({ error: "Barcode lookup failed.", status: response.status }, { status: 502 });
  }

  const payload = (await response.json()) as { status?: string; product?: unknown };
  if (payload.status !== "success" || !payload.product) {
    return Response.json({ error: "Product not found." }, { status: 404 });
  }

  const food = mapOffProduct(payload.product as Parameters<typeof mapOffProduct>[0], barcode);
  if (!food) {
    return Response.json({ error: "Product nutrition could not be parsed." }, { status: 422 });
  }

  return Response.json({ food });
}
