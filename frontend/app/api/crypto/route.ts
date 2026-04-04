import { NextResponse } from "next/server";

const CG = "https://api.coingecko.com/api/v3";
const CC = "https://min-api.cryptocompare.com/data";

const ALL_IDS = [
  "usd-coin", "tether",
  "bitcoin", "ethereum", "binancecoin", "solana", "ripple",
  "dogecoin", "pepe", "bonk",
];

const ID_TO_SYM: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", binancecoin: "BNB", solana: "SOL",
  ripple: "XRP", dogecoin: "DOGE", pepe: "PEPE", bonk: "BONK",
  "usd-coin": "USDC", tether: "USDT",
};

// 60-second server-side cache
let priceCache: { data: Record<string, unknown>; ts: number } | null = null;
const chartCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_MS = 60_000;

async function timedFetch(url: string, ms = 7000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    clearTimeout(t);
    return res;
  } catch (e) { clearTimeout(t); throw e; }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "prices";

  // ── Chart ──────────────────────────────────────────────────────────────
  if (type === "chart") {
    const id = searchParams.get("id") ?? "bitcoin";
    const rawDays = searchParams.get("days") ?? "7";
    const days = ["1", "7", "30", "365"].includes(rawDays) ? rawDays : "7";
    const key = id + "-" + days;

    const cached = chartCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_MS) {
      return NextResponse.json(cached.data);
    }

    // Try CoinGecko
    try {
      const res = await timedFetch(
        `${CG}/coins/${id}/market_chart?vs_currency=usd&days=${days}&precision=6`
      );
      if (res.status === 429) throw new Error("rate-limited");
      if (!res.ok) throw new Error("CG " + res.status);
      const data = await res.json();
      if (!Array.isArray(data.prices) || data.prices.length === 0) throw new Error("empty");
      const payload = { prices: data.prices as [number, number][] };
      chartCache.set(key, { data: payload, ts: Date.now() });
      return NextResponse.json(payload);
    } catch (e) {
      console.warn("[chart] CoinGecko failed:", e);
    }

    // Fallback: CryptoCompare
    try {
      const sym = ID_TO_SYM[id] ?? "BTC";
      const d = Number(days);
      const endpoint = d <= 1 ? "histominute" : d <= 30 ? "histohour" : "histoday";
      const limit = d <= 1 ? 144 : d <= 7 ? 168 : d <= 30 ? d * 24 : 365;
      const res = await timedFetch(`${CC}/v2/${endpoint}?fsym=${sym}&tsym=USD&limit=${limit}`);
      const json = await res.json();
      if (json.Response === "Error" || !json.Data?.Data?.length) throw new Error("empty CC");
      const prices: [number, number][] = json.Data.Data.map(
        (pt: { time: number; close: number }) => [pt.time * 1000, pt.close]
      );
      const payload = { prices };
      chartCache.set(key, { data: payload, ts: Date.now() });
      return NextResponse.json(payload);
    } catch (e) {
      console.error("[chart] both APIs failed:", e);
      const stale = chartCache.get(key);
      if (stale) return NextResponse.json(stale.data);
      return NextResponse.json({ prices: [] });
    }
  }

  // ── Prices ─────────────────────────────────────────────────────────────
  if (priceCache && Date.now() - priceCache.ts < CACHE_MS) {
    return NextResponse.json(priceCache.data);
  }

  // Try CoinGecko
  try {
    const res = await timedFetch(
      `${CG}/simple/price?ids=${ALL_IDS.join(",")}&vs_currencies=usd,inr&include_24hr_change=true&precision=6`
    );
    if (res.status === 429) throw new Error("rate-limited");
    if (!res.ok) throw new Error("CG " + res.status);
    const raw = await res.json();
    const data: Record<string, { usd: number; inr: number; usd_24h_change: number }> = {};
    for (const id of ALL_IDS) {
      data[id] = {
        usd: raw[id]?.usd ?? 0,
        inr: raw[id]?.inr ?? 0,
        usd_24h_change: raw[id]?.usd_24h_change ?? 0,
      };
    }
    priceCache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (e) {
    console.warn("[prices] CoinGecko failed:", e);
  }

  // Fallback: CryptoCompare
  try {
    const allSyms = Object.values(ID_TO_SYM).join(",");
    const [priceRes, changeRes] = await Promise.all([
      timedFetch(`${CC}/pricemulti?fsyms=${allSyms}&tsyms=USD,INR`),
      timedFetch(`${CC}/pricemultifull?fsyms=${allSyms}&tsyms=USD`),
    ]);
    const priceData = await priceRes.json();
    const changeData = await changeRes.json();
    const data: Record<string, { usd: number; inr: number; usd_24h_change: number }> = {};
    for (const [cgId, sym] of Object.entries(ID_TO_SYM)) {
      data[cgId] = {
        usd: priceData[sym]?.USD ?? 0,
        inr: priceData[sym]?.INR ?? 0,
        usd_24h_change: changeData.RAW?.[sym]?.USD?.CHANGEPCT24HOUR ?? 0,
      };
    }
    priceCache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch (e) {
    console.error("[prices] both APIs failed:", e);
    if (priceCache) return NextResponse.json(priceCache.data);
    return NextResponse.json(FALLBACK);
  }
}

const FALLBACK: Record<string, { usd: number; inr: number; usd_24h_change: number }> = {
  ethereum:    { usd: 3500,     inr: 290000,  usd_24h_change: 0 },
  bitcoin:     { usd: 67000,    inr: 5580000, usd_24h_change: 0 },
  binancecoin: { usd: 580,      inr: 48200,   usd_24h_change: 0 },
  solana:      { usd: 140,      inr: 11600,   usd_24h_change: 0 },
  ripple:      { usd: 0.50,     inr: 41,      usd_24h_change: 0 },
  dogecoin:    { usd: 0.15,     inr: 12,      usd_24h_change: 0 },
  pepe:        { usd: 0.000008, inr: 0.00066, usd_24h_change: 0 },
  bonk:        { usd: 0.000018, inr: 0.0015,  usd_24h_change: 0 },
  "usd-coin":  { usd: 1,        inr: 83,      usd_24h_change: 0 },
  tether:      { usd: 1,        inr: 83,      usd_24h_change: 0 },
};
