import { NextResponse } from "next/server";

// CryptoCompare — free tier, no API key required for basic endpoints
const CC = "https://min-api.cryptocompare.com/data";

// Map our CoinGecko-style IDs → CryptoCompare symbols
const ID_TO_SYMBOL: Record<string, string> = {
  bitcoin:     "BTC",
  ethereum:    "ETH",
  binancecoin: "BNB",
  solana:      "SOL",
  ripple:      "XRP",
  dogecoin:    "DOGE",
  pepe:        "PEPE",
  bonk:        "BONK",
  "usd-coin":  "USDC",
  tether:      "USDT",
};

const ALL_SYMBOLS = Object.values(ID_TO_SYMBOL).join(",");

// ── Server-side cache ────────────────────────────────────────────────────
let priceCache: { data: Record<string, unknown>; ts: number } | null = null;
const chartCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_MS = 60_000;

// ── Simple fetch with timeout ────────────────────────────────────────────
async function fetchCC(url: string, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("CryptoCompare " + res.status);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Hard fallback prices (keyed by CoinGecko ID) ─────────────────────────
const FALLBACK: Record<string, { usd: number; inr: number; usd_24h_change: number }> = {
  ethereum:    { usd: 3500,     inr: 290000,  usd_24h_change: 0 },
  bitcoin:     { usd: 68000,    inr: 5650000, usd_24h_change: 0 },
  binancecoin: { usd: 600,      inr: 50000,   usd_24h_change: 0 },
  solana:      { usd: 140,      inr: 11600,   usd_24h_change: 0 },
  ripple:      { usd: 0.50,     inr: 41,      usd_24h_change: 0 },
  dogecoin:    { usd: 0.12,     inr: 10,      usd_24h_change: 0 },
  pepe:        { usd: 0.000008, inr: 0.00066, usd_24h_change: 0 },
  bonk:        { usd: 0.000018, inr: 0.0015,  usd_24h_change: 0 },
  "usd-coin":  { usd: 1,        inr: 83,      usd_24h_change: 0 },
  tether:      { usd: 1,        inr: 83,      usd_24h_change: 0 },
};

// ── Route handler ────────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "prices";

  // ── Chart ──────────────────────────────────────────────────────────────
  if (type === "chart") {
    const id = searchParams.get("id") ?? "bitcoin";
    const rawDays = searchParams.get("days") ?? "7";
    const days = ["1", "7", "30", "365"].includes(rawDays) ? Number(rawDays) : 7;
    const symbol = ID_TO_SYMBOL[id] ?? "BTC";
    const key = id + "-" + days;

    const cached = chartCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      return NextResponse.json(cached.data);
    }

    try {
      // CryptoCompare endpoints:
      //   days=1  → histominute (last 1440 min = 24h, limit 144 = every 10min)
      //   days=7  → histohour   (limit 168)
      //   days=30 → histohour   (limit 720)
      //   days=365→ histoday    (limit 365)
      let endpoint: string;
      let limit: number;

      if (days === 1) {
        endpoint = "histominute";
        limit = 144; // every 10 min over 24h
      } else if (days <= 30) {
        endpoint = "histohour";
        limit = days * 24;
      } else {
        endpoint = "histoday";
        limit = days;
      }

      const url = `${CC}/v2/${endpoint}?fsym=${symbol}&tsym=USD&limit=${limit}`;
      const res = await fetchCC(url);
      const json = await res.json();

      if (json.Response === "Error" || !json.Data?.Data?.length) {
        throw new Error(json.Message ?? "empty response");
      }

      // Convert to [[timestamp_ms, price]] format matching our existing interface
      const prices: [number, number][] = json.Data.Data.map(
        (pt: { time: number; close: number }) => [pt.time * 1000, pt.close]
      );

      const payload = { prices };
      chartCache.set(key, { data: payload, ts: Date.now() });
      return NextResponse.json(payload);
    } catch (err) {
      console.error("[/api/crypto] chart failed:", err);
      const stale = chartCache.get(key);
      if (stale) return NextResponse.json(stale.data);
      // Synthetic fallback so UI never hangs
      return NextResponse.json({ prices: syntheticChart(days) });
    }
  }

  // ── Prices ─────────────────────────────────────────────────────────────
  if (priceCache && Date.now() - priceCache.ts < CACHE_MS) {
    return NextResponse.json(priceCache.data);
  }

  try {
    // Fetch USD + INR prices and 24h change in one call
    const [priceRes, changeRes] = await Promise.all([
      fetchCC(`${CC}/pricemulti?fsyms=${ALL_SYMBOLS}&tsyms=USD,INR`),
      fetchCC(`${CC}/pricemultifull?fsyms=${ALL_SYMBOLS}&tsyms=USD`),
    ]);

    const priceData = await priceRes.json();
    const changeData = await changeRes.json();

    // Build response keyed by CoinGecko ID (what our frontend expects)
    const result: Record<string, { usd: number; inr: number; usd_24h_change: number }> = {};

    for (const [cgId, symbol] of Object.entries(ID_TO_SYMBOL)) {
      const sym = symbol.toUpperCase();
      const usd = priceData[sym]?.USD ?? 0;
      const inr = priceData[sym]?.INR ?? 0;
      const change = changeData.RAW?.[sym]?.USD?.CHANGEPCT24HOUR ?? 0;
      result[cgId] = { usd, inr, usd_24h_change: change };
    }

    priceCache = { data: result, ts: Date.now() };
    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/crypto] prices failed:", err);
    if (priceCache) return NextResponse.json(priceCache.data);
    return NextResponse.json(FALLBACK);
  }
}

// ── Synthetic chart (last-resort fallback) ───────────────────────────────
function syntheticChart(days: number): [number, number][] {
  const points = days <= 1 ? 144 : days <= 7 ? 168 : days <= 30 ? 720 : 365;
  const msPerStep = (days * 86_400_000) / points;
  const now = Date.now();
  let price = 68000;
  return Array.from({ length: points }, (_, i) => {
    price *= 1 + (Math.random() - 0.5) * 0.008;
    return [now - (points - i) * msPerStep, Math.round(price * 100) / 100];
  });
}
