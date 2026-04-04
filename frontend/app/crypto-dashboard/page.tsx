"use client";

import { useMemo } from "react";
import { COINS, type CoinMeta, formatUSD, formatINR } from "@/services/cryptoApi";
import { useCryptoData } from "@/hooks/useCryptoData";
import CryptoCard from "@/components/crypto/CryptoCard";
import CryptoChart from "@/components/crypto/CryptoChart";
import Navbar from "@/components/Navbar";

const SECTIONS: { label: string; coins: readonly CoinMeta[] }[] = [
  { label: "Stablecoins",  coins: COINS.stablecoins },
  { label: "Most Used",    coins: COINS.mostUsed    },
  { label: "Memecoins",    coins: COINS.memecoins   },
];

export default function CryptoDashboardPage() {
  const {
    prices, pricesLoading, pricesError,
    chartData, chartLoading, chartError,
    selectedId, selectedRange,
    selectCoin, selectRange, refresh,
  } = useCryptoData();

  const selectedCoin = useMemo(() => {
    if (!selectedId) return null;
    return [
      ...COINS.stablecoins,
      ...COINS.mostUsed,
      ...COINS.memecoins,
    ].find((c) => c.id === selectedId) ?? null;
  }, [selectedId]);

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20 transition-colors">

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] dark:text-white">Crypto Market</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-xs">Live prices in USD & INR</p>
        </div>
        <button
          onClick={refresh}
          className="w-9 h-9 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0] dark:border-gray-700"
          title="Refresh prices"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280">
            <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">

        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-[#111827] dark:text-white mb-1">Crypto Market Overview</h1>
            <p className="text-[#6b7280] dark:text-gray-400">Live prices in USD & INR · Auto-refreshes every 60s</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-[#e5e9f0] dark:border-gray-700 text-sm font-semibold text-[#374151] dark:text-gray-300 hover:bg-[#f3f4f6] dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Global error */}
        {pricesError && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-2xl px-4 py-3 mb-6">
            {pricesError}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: coin list */}
          <div className="flex flex-col gap-6 lg:w-[420px] lg:flex-shrink-0">
            {SECTIONS.map(({ label, coins }) => (
              <div key={label}>
                <h2 className="text-xs font-bold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-3 px-1">
                  {label}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  {coins.map((coin) => (
                    <CryptoCard
                      key={coin.id}
                      coin={coin}
                      price={prices[coin.id]}
                      loading={pricesLoading}
                      selected={selectedId === coin.id}
                      onClick={() => selectCoin(coin.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Right: chart */}
          <div className="flex-1 min-w-0">
            <div className="sticky top-20">
              {selectedCoin ? (
                <CryptoChart
                  coin={selectedCoin}
                  data={chartData}
                  loading={chartLoading}
                  error={chartError}
                  range={selectedRange}
                  onRangeChange={selectRange}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 border border-[#e5e9f0] dark:border-gray-700 text-center shadow-sm">
                  <p className="text-[#9ca3af] dark:text-gray-500 text-sm">Select a coin to view its chart</p>
                </div>
              )}

              {/* Selected coin price summary */}
              {selectedCoin && prices[selectedCoin.id] && !pricesLoading && (
                <div className="mt-4 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-[#e5e9f0] dark:border-gray-700 shadow-sm transition-colors">
                  <p className="text-xs font-bold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-3">
                    {selectedCoin.name} · {selectedCoin.symbol}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-0.5">Price (USD)</p>
                      <p className="text-xl font-black text-[#111827] dark:text-white">
                        {prices[selectedCoin.id] ? formatUSD(prices[selectedCoin.id].usd) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-0.5">Price (INR)</p>
                      <p className="text-xl font-black text-[#111827] dark:text-white">
                        {prices[selectedCoin.id] ? formatINR(prices[selectedCoin.id].inr) : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
