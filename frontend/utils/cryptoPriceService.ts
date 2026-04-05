/**
 * Crypto Price Service
 * Fetches cryptocurrency prices via /api/crypto (server proxy).
 * Avoids CORS issues and rate limiting from direct CoinGecko calls.
 */

import { CryptoSymbol, CRYPTO_CONFIGS } from './cryptoConfig';

const CACHE_DURATION = 60_000; // 60 seconds — matches server-side cache

interface PriceCache {
  prices: Record<CryptoSymbol, number>; // Price in INR
  timestamp: number;
  expiresAt: number;
}

export interface PriceFetchResult {
  prices: Record<CryptoSymbol, number>;
  cached: boolean;
  error?: string;
}

let priceCache: PriceCache | null = null;
let fetchPromise: Promise<PriceFetchResult> | null = null;

// CoinGecko ID → CryptoSymbol reverse map
const COINGECKO_TO_SYMBOL: Record<string, CryptoSymbol> = Object.fromEntries(
  Object.entries(CRYPTO_CONFIGS).map(([sym, cfg]) => [cfg.coingeckoId, sym as CryptoSymbol])
);

/**
 * Fetch crypto prices with caching and deduplication.
 * Routes through /api/crypto to avoid CORS and rate limits.
 */
export async function fetchCryptoPrices(): Promise<PriceFetchResult> {
  if (priceCache && Date.now() < priceCache.expiresAt) {
    return { prices: priceCache.prices, cached: true };
  }

  if (fetchPromise) return fetchPromise;

  fetchPromise = fetchPricesFromAPI();
  const result = await fetchPromise;
  fetchPromise = null;
  return result;
}

async function fetchPricesFromAPI(): Promise<PriceFetchResult> {
  try {
    // Use our own server-side proxy — no CORS, no rate limiting
    const res = await fetch("/api/crypto?type=prices", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });

    if (!res.ok) throw new Error("API error: " + res.status);

    // Response shape: { [coingeckoId]: { usd, inr, usd_24h_change } }
    const data = await res.json();

    const prices: Partial<Record<CryptoSymbol, number>> = {};

    Object.entries(data).forEach(([cgId, val]) => {
      const symbol = COINGECKO_TO_SYMBOL[cgId];
      if (symbol && typeof (val as { inr?: number }).inr === "number") {
        prices[symbol] = (val as { inr: number }).inr;
      }
    });

    priceCache = {
      prices: prices as Record<CryptoSymbol, number>,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };

    return { prices: prices as Record<CryptoSymbol, number>, cached: false };
  } catch (error) {
    console.error("fetchCryptoPrices failed:", error);

    if (priceCache) {
      return { prices: priceCache.prices, cached: true, error: "Using cached prices" };
    }

    // Hard fallback — keeps UI alive
    const fallbackPrices: Record<CryptoSymbol, number> = {
      USDC: 83, USDT: 83,
      BTC: 7500000, ETH: 290000, BNB: 50000,
      SOL: 12000, XRP: 150,
      DOGE: 20, PEPE: 0.0015, BONK: 0.002,
    };

    return { prices: fallbackPrices, cached: false, error: "Using fallback prices" };
  }
}

/**
 * Get price for a specific crypto
 */
export function getCryptoPrice(
  symbol: CryptoSymbol,
  prices: Record<CryptoSymbol, number>
): number {
  return prices[symbol] || 0;
}

/**
 * Convert crypto amount to INR
 */
export function cryptoToINR(
  amount: number,
  symbol: CryptoSymbol,
  prices: Record<CryptoSymbol, number>
): number {
  const price = getCryptoPrice(symbol, prices);
  return amount * price;
}

/**
 * Convert INR to crypto amount
 */
export function inrToCrypto(
  inr: number,
  symbol: CryptoSymbol,
  prices: Record<CryptoSymbol, number>
): number {
  const price = getCryptoPrice(symbol, prices);
  if (price === 0) return 0;
  return inr / price;
}

/**
 * Get cache age in seconds
 */
export function getCacheAge(): number {
  if (!priceCache) return 0;
  return Math.floor((Date.now() - priceCache.timestamp) / 1000);
}

/**
 * Check if cache is expired
 */
export function isCacheExpired(): boolean {
  if (!priceCache) return true;
  return Date.now() >= priceCache.expiresAt;
}
