"use client";

import { useWallet } from "@/wallet/walletHooks";

export default function WalletCard() {
  const { address, shortAddress, balance, loading, error, isConnected, refreshBalance } = useWallet();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Smart Wallet</p>
        <span
          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
            loading
              ? "bg-[#fef3c7] dark:bg-yellow-900 text-[#d97706] dark:text-yellow-400"
              : isConnected
              ? "bg-[#f0fdf4] dark:bg-green-900 text-[#15803d] dark:text-green-400"
              : "bg-[#fee2e2] dark:bg-red-900 text-[#dc2626] dark:text-red-400"
          }`}
        >
          {loading ? "Loading..." : isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-4 bg-[#f3f4f6] dark:bg-gray-700 rounded-lg w-3/4" />
          <div className="h-6 bg-[#f3f4f6] dark:bg-gray-700 rounded-lg w-1/2" />
        </div>
      ) : error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#eef2ff] dark:bg-blue-950 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8">
                <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-[#6b7280] dark:text-gray-400">Address</p>
              <p className="text-sm font-bold text-[#111827] dark:text-white font-mono">{shortAddress ?? "—"}</p>
            </div>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-0.5">Balance</p>
              <p className="text-2xl font-black text-[#111827] dark:text-white">
                {balance} <span className="text-sm font-semibold text-[#6b7280] dark:text-gray-400">MATIC</span>
              </p>
            </div>
            <button onClick={refreshBalance} className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400 hover:underline">
              Refresh
            </button>
          </div>

          {address && (
            <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 mt-3 font-mono break-all">{address}</p>
          )}
        </>
      )}
    </div>
  );
}
