/**
 * getEthPrice.ts
 * Delegates to the centralized /api/crypto proxy via fetchPrices().
 * This file exists for backward compatibility — all pages that import
 * { getEthPriceINR, formatINR, ethToINR, … } from "@/utils/getEthPrice"
 * will now share the same in-memory cache & deduplication defined in
 * services/cryptoApi.ts, eliminating duplicate network calls.
 */

import { fetchPrices } from "@/services/cryptoApi";

const FALLBACK_PRICE = 290_000; // ₹2,90,000

// Single in-flight guard so concurrent callers await the same promise
let inflight: Promise<number> | null = null;

export async function getEthPriceINR(): Promise<number> {
  // Reuse in-flight request if one is already running
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      // fetchPrices already has 60-second cache + error handling
      const prices = await fetchPrices(["ethereum"]);
      const eth = prices.find((p) => p.id === "ethereum");
      if (eth && eth.inr > 0) return eth.inr;
      return FALLBACK_PRICE;
    } catch (err) {
      console.error("[getEthPriceINR] failed:", err);
      return FALLBACK_PRICE;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// ── Formatting helpers ────────────────────────────────────────────────────

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatETH(amount: number): string {
  return `${amount.toFixed(4)} ETH`;
}

export function ethToINR(ethAmount: number, ethPrice: number): number {
  return ethAmount * ethPrice;
}

export function inrToETH(inrAmount: number, ethPrice: number): number {
  if (!ethPrice) return 0;
  return inrAmount / ethPrice;
}
