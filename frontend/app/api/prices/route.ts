import { NextResponse } from "next/server";

const COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price";

// Server-side cache
let cache: { data: Record<string, unknown>; expiresAt: number } | null = null;
const CACHE_MS = 30_000; // 30 seconds

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids") ?? "";

  // Return cached response if still valid
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT" },
    });
  }

  try {
    const res = await fetch(
      `${COINGECKO_URL}?ids=${ids}&vs_currencies=inr`,
      { headers: { Accept: "application/json" }, next: { revalidate: 30 } }
    );

    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);

    const data = await res.json();
    cache = { data, expiresAt: Date.now() + CACHE_MS };

    return NextResponse.json(data, { headers: { "X-Cache": "MISS" } });
  } catch (err) {
    console.error("Price proxy error:", err);
    // Return stale cache if available
    if (cache) {
      return NextResponse.json(cache.data, { headers: { "X-Cache": "STALE" } });
    }
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 502 });
  }
}
