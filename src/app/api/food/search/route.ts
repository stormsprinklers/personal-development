export const runtime = "nodejs";

import { mapUsdaSearchFood } from "@/lib/nutrition/usda-mapper";

export async function GET(request: Request) {
  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "USDA API key is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  if (query.length < 2) {
    return Response.json({ items: [] });
  }

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("pageNumber", String(page));
  for (const dataType of ["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"]) {
    url.searchParams.append("dataType", dataType);
  }

  const response = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!response.ok) {
    return Response.json({ error: "Food search failed.", status: response.status }, { status: 502 });
  }

  const payload = (await response.json()) as { foods?: unknown[] };
  const items = (payload.foods ?? [])
    .map((food) => mapUsdaSearchFood(food as Parameters<typeof mapUsdaSearchFood>[0]))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return Response.json({ items });
}
