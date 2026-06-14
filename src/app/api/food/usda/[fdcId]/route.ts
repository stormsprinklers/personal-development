export const runtime = "nodejs";

import { mapUsdaFoodDetail } from "@/lib/nutrition/usda-mapper";

type RouteContext = { params: Promise<{ fdcId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "USDA API key is not configured." }, { status: 500 });
  }

  const { fdcId } = await context.params;
  if (!fdcId || !/^\d+$/.test(fdcId)) {
    return Response.json({ error: "Invalid food ID." }, { status: 400 });
  }

  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) {
    return Response.json({ error: "Could not load food details.", status: response.status }, { status: 502 });
  }

  const payload = await response.json();
  const food = mapUsdaFoodDetail(payload);
  if (!food) {
    return Response.json({ error: "Food details could not be parsed." }, { status: 422 });
  }

  return Response.json({ food });
}
