/**
 * Crypto Price Service
 * Fetches cryptocurrency prices from CoinGecko API with caching
 */

import { CryptoSymbol, CRYPTO_CONFIGS } from './cryptoConfig';

const CACHE_DURATION = 10000; // 10 seconds
const API_ENDPOINT = 'https://api.coingecko.com/api/v3/simple/price';

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

/**
 * Fetch crypto prices with caching and deduplication
 * Prices are cached for 10 seconds to prevent API spam
 */
export async function fetchCryptoPrices(): Promise<PriceFetchResult> {
  // Return cached prices if still valid
  if (priceCache && Date.now() < priceCache.expiresAt) {
    return {
      prices: priceCache.prices,
      cached: true,
    };
  }
  
  // Deduplicate concurrent requests
  if (fetchPromise) {
    return fetchPromise;
  }
  
  fetchPromise = fetchPricesFromAPI();
  const result = await fetchPromise;
  fetchPromise = null;
  
  return result;
}

/**
 * Fetch prices from CoinGecko API
 */
async function fetchPricesFromAPI(): Promise<PriceFetchResult> {
  try {
    const ids = Object.values(CRYPTO_CONFIGS)
      .map(c => c.coingeckoId)
      .join(',');
    
    const response = await fetch(
      `${API_ENDPOINT}?ids=${ids}&vs_currencies=inr`,
      { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map response to our structure
    const prices: Partial<Record<CryptoSymbol, number>> = {};
    
    Object.entries(CRYPTO_CONFIGS).forEach(([symbol, config]) => {
      const price = data[config.coingeckoId]?.inr;
      if (price) {
        prices[symbol as CryptoSymbol] = price;
      }
    });
    
    // Update cache
    priceCache = {
      prices: prices as Record<CryptoSymbol, number>,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };
    
    return {
      prices: prices as Record<CryptoSymbol, number>,
      cached: false,
    };
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    
    // Return cached prices if available, even if expired
    if (priceCache) {
      return {
        prices: priceCache.prices,
        cached: true,
        error: 'Using cached prices (API unavailable)',
      };
    }
    
    // Return fallback prices if no cache
    const fallbackPrices: Record<CryptoSymbol, number> = {
      'USDC': 83,
      'USDT': 83,
      'BTC': 7500000,
      'ETH': 192000,
      'BNB': 45000,
      'SOL': 12000,
      'XRP': 150,
      'DOGE': 20,
      'PEPE': 0.0015,
      'BONK': 0.002,
    };
    
    return {
      prices: fallbackPrices,
      cached: false,
      error: 'Using fallback prices (API unavailable)',
    };
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
