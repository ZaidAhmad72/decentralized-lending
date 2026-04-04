/**
 * cryptoApi.ts — all CoinGecko calls go through /api/crypto (server proxy).
 * Avoids CORS issues, rate limiting, and duplicate client-side requests.
 *
 * Features:
 * - 60-second in-memory cache for prices & chart
 * - Request deduplication (inflight promise reuse)
 * - Graceful fallback to cached / zero values on failure
 */

export const COINS = {
  stablecoins: [
    { id: "usd-coin",  symbol: "USDC", name: "USD Coin" },
    { id: "tether",    symbol: "USDT", name: "Tether"   },
  ],
  mostUsed: [
    { id: "bitcoin",     symbol: "BTC", name: "Bitcoin"  },
    { id: "ethereum",    symbol: "ETH", name: "Ethereum" },
    { id: "binancecoin", symbol: "BNB", name: "BNB"      },
    { id: "solana",      symbol: "SOL", name: "Solana"   },
    { id: "ripple",      symbol: "XRP", name: "XRP"      },
  ],
  memecoins: [
    { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
    { id: "pepe",     symbol: "PEPE", name: "Pepe"     },
    { id: "bonk",     symbol: "BONK", name: "Bonk"     },
  ],
} as const;

export type CoinMeta = { id: string; symbol: string; name: string };

export interface CoinPrice {
  id: string;
  usd: number;
  inr: number;
  usd_24h_change: number;
}

export type TimeRange = "1D" | "1W" | "1M" | "1Y";

const RANGE_DAYS: Record<TimeRange, string> = {
  "1D": "1",
  "1W": "7",
  "1M": "30",
  "1Y": "365",
};

// ── Client-side cache ────────────────────────────────────────────────────
let priceCache: { data: CoinPrice[]; ts: number } | null = null;
const chartCache = new Map<string, { data: [number, number][]; ts: number }>();
const CACHE_MS = 60_000;

// ── Inflight deduplication ───────────────────────────────────────────────
let priceInflight: Promise<CoinPrice[]> | null = null;
const chartInflight = new Map<string, Promise<[number, number][]>>();

export async function fetchPrices(ids: string[]): Promise<CoinPrice[]> {
  // Return cached if fresh
  if (priceCache && Date.now() - priceCache.ts < CACHE_MS) return priceCache.data;

  // Reuse inflight request
  if (priceInflight) return priceInflight;

  priceInflight = (async () => {
    try {
      const res = await fetch("/api/crypto?type=prices", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("/api/crypto responded with " + res.status);
      const raw = await res.json();

      const data = ids.map((id) => ({
        id,
        usd: raw[id]?.usd ?? 0,
        inr: raw[id]?.inr ?? 0,
        usd_24h_change: raw[id]?.usd_24h_change ?? 0,
      }));
      priceCache = { data, ts: Date.now() };
      return data;
    } catch (err) {
      console.error("[fetchPrices] failed:", err);
      return priceCache?.data ?? ids.map((id) => ({ id, usd: 0, inr: 0, usd_24h_change: 0 }));
    } finally {
      priceInflight = null;
    }
  })();

  return priceInflight;
}

export async function fetchChart(id: string, range: TimeRange): Promise<[number, number][]> {
  const key = id + "-" + range;

  // Return cached if fresh
  const cached = chartCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_MS) return cached.data;

  // Reuse inflight request for the same key
  const existing = chartInflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const days = RANGE_DAYS[range];
      const res = await fetch("/api/crypto?type=chart&id=" + id + "&days=" + days, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error("/api/crypto chart responded with " + res.status);
      const raw = await res.json();
      const data: [number, number][] = raw.prices ?? [];
      chartCache.set(key, { data, ts: Date.now() });
      return data;
    } catch (err) {
      console.error("[fetchChart] failed:", err);
      return chartCache.get(key)?.data ?? [];
    } finally {
      chartInflight.delete(key);
    }
  })();

  chartInflight.set(key, promise);
  return promise;
}

export function allCoinIds(): string[] {
  return [
    ...COINS.stablecoins,
    ...COINS.mostUsed,
    ...COINS.memecoins,
  ].map((c) => c.id);
}

export function formatUSD(n: number): string {
  if (n < 0.01) return "$" + n.toFixed(6);
  if (n < 1)    return "$" + n.toFixed(4);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatINR(n: number): string {
  if (n < 1) return "\u20B9" + n.toFixed(4);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
