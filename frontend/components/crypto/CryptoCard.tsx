"use client";

import { type CoinPrice, type CoinMeta, formatUSD, formatINR } from "@/services/cryptoApi";

interface Props {
  coin: CoinMeta;
  price: CoinPrice | undefined;
  loading: boolean;
  selected: boolean;
  onClick: () => void;
}

export default function CryptoCard({ coin, price, loading, selected, onClick }: Props) {
  const change = price?.usd_24h_change ?? 0;
  const positive = change >= 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 border transition-all duration-200 hover:shadow-md active:scale-[0.98] ${
        selected
          ? "border-[#1a2fb8] dark:border-blue-500 bg-[#eef2ff] dark:bg-blue-950 shadow-md"
          : "border-[#e5e9f0] dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-[#1a2fb8] dark:hover:border-blue-500"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold text-[#111827] dark:text-white text-sm">{coin.name}</p>
          <p className="text-xs text-[#6b7280] dark:text-gray-400 font-mono">{coin.symbol}</p>
        </div>
        {!loading && price && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            positive
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
          }`}>
            {positive ? "+" : ""}{change.toFixed(2)}%
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-1.5 animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      ) : price ? (
        <div>
          <p className="text-lg font-black text-[#111827] dark:text-white">{formatUSD(price.usd)}</p>
          <p className="text-sm text-[#6b7280] dark:text-gray-400">{formatINR(price.inr)}</p>
        </div>
      ) : (
        <p className="text-xs text-[#9ca3af] dark:text-gray-500">Data unavailable</p>
      )}
    </button>
  );
}
