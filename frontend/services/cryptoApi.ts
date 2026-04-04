/**
 * cryptoApi.ts — CoinGecko public API wrapper.
 * Isolated service: touches no existing code.
 */

export const COINS = {
  stablecoins: [
    { id: "usd-coin",  symbol: "USDC",  name: "USD Coin"  },
    { id: "tether",    symbol: "USDT",  name: "Tether"    },
  ],
  mostUsed: [
    { id: "bitcoin",  symbol: "BTC", name: "Bitcoin"  },
    { id: "ethereum", symbol: "ETH", name: "Ethereum" },
    { id: "binancecoin", symbol: "BNB", name: "BNB"   },
    { id: "solana",   symbol: "SOL", name: "Solana"   },
    { id: "ripple",   symbol: "XRP", name: "XRP"      },
  ],
  memecoins: [
    { id: "dogecoin",     symbol: "DOGE", name: "Dogecoin" },
    { id: "pepe",         symbol: "PEPE", name: "Pepe"     },
    { id: "bonk",         symbol: "BONK", name: "Bonk"     },
  ],
} as const;

export type CoinMeta = { id: string; symbol: string; name: string };

export interface CoinPrice {
  id: string;
  usd: number;
  inr: number;
  usd_24h_change: number;
}

export type TimeRange = "1D" | "1W" | "1M" | "1Y" | "5Y";

const RANGE_DAYS: Record<TimeRange, number> = {
  "1D": 1,
  "1W": 7,
  "1M": 30,
  "1Y": 365,
  "5Y": 1825,
};

const BASE = "https://api.coingecko.com/api/v3";

// Simple in-memory cache — mutable refs
let priceCache: { data: CoinPrice[]; ts: number } | null = null;
const chartCache = new Map<string, { data: [number, number][]; ts: number }>();
const CACHE_MS = 60_000; // 1 minute

export async function fetchPrices(ids: string[]): Promise<CoinPrice[]> {
  if (priceCache && Date.now() - priceCache.ts < CACHE_MS) return priceCache.data;

  const url = `${BASE}/simple/price?ids=${ids.join(",")}&vs_currencies=usd,inr&include_24hr_change=true`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`CoinGecko price fetch failed: ${res.status}`);
  const raw = await res.json();

  const data = ids.map((id) => ({
    id,
    usd: raw[id]?.usd ?? 0,
    inr: raw[id]?.inr ?? 0,
    usd_24h_change: raw[id]?.usd_24h_change ?? 0,
  }));
  priceCache = { data, ts: Date.now() };
  return data;
}

export async function fetchChart(id: string, range: TimeRange): Promise<[number, number][]> {
  const key = `${id}-${range}`;
  const cached = chartCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;

  const days = RANGE_DAYS[range];
  // CoinGecko auto-granularity: 1d=5min, ≤90d=hourly, >90d=daily
  // For 5Y we pass "max" to get the full history
  const daysParam = range === "5Y" ? "max" : days;
  const url = `${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${daysParam}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko chart fetch failed: ${res.status}`);
  const raw = await res.json();
  const data: [number, number][] = raw.prices ?? [];
  chartCache.set(key, { data, ts: Date.now() });
  return data;
}

export function allCoinIds(): string[] {
  return [
    ...COINS.stablecoins,
    ...COINS.mostUsed,
    ...COINS.memecoins,
  ].map((c) => c.id);
}

export function formatUSD(n: number): string {
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1)    return `$${n.toFixed(4)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

export function formatINR(n: number): string {
  if (n < 1) return `₹${n.toFixed(4)}`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}
