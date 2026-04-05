"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { usePolygonWallet } from "@/wallet/usePolygonWallet";

export default function PolygonWalletCard() {
  const {
    address, shortAddress, balance, network,
    isLoading, error, refreshBalance, sendTransaction,
  } = usePolygonWallet();

  const [copied, setCopied] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txResult, setTxResult] = useState<{ hash: string; url: string } | null>(null);
  const [sendError, setSendError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalance();
    setRefreshing(false);
  };

  const handleSend = async () => {
    setSendError("");
    setTxResult(null);

    if (!ethers.isAddress(toAddress)) {
      setSendError("Invalid recipient address");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setSendError("Enter a valid amount");
      return;
    }

    setSending(true);
    try {
      const result = await sendTransaction(toAddress, amount);
      setTxResult({ hash: result.txHash, url: result.explorerUrl });
      setToAddress("");
      setAmount("");
      await refreshBalance();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
          </svg>
          <p className="text-sm text-[#6b7280]">Loading Polygon wallet...</p>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
        <p className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-1">Polygon Wallet</p>
        <p className="text-sm text-[#9ca3af]">Not connected</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#7b3fe4] to-[#a855f7] rounded-3xl p-5 shadow-lg text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {/* Polygon logo */}
            <svg width="18" height="18" viewBox="0 0 38 33" fill="white">
              <path d="M29 10.2a2.5 2.5 0 0 0-2.5 0L21 13.4l-3.5 2-5.5 3.2a2.5 2.5 0 0 1-2.5 0L5 15.4a2.5 2.5 0 0 1-1.2-2.1v-5.6A2.5 2.5 0 0 1 5 5.6l4.5-2.6a2.5 2.5 0 0 1 2.5 0L16.5 5.6a2.5 2.5 0 0 1 1.2 2.1v3.2l3.5-2V5.7a2.5 2.5 0 0 0-1.2-2.1L12.2.4a2.5 2.5 0 0 0-2.5 0L1.2 5.6A2.5 2.5 0 0 0 0 7.7v10.4a2.5 2.5 0 0 0 1.2 2.1l8.5 4.9a2.5 2.5 0 0 0 2.5 0l5.5-3.2 3.5-2 5.5-3.2a2.5 2.5 0 0 1 2.5 0l4.5 2.6a2.5 2.5 0 0 1 1.2 2.1v5.6a2.5 2.5 0 0 1-1.2 2.1L29 29.7a2.5 2.5 0 0 1-2.5 0l-4.5-2.6a2.5 2.5 0 0 1-1.2-2.1v-3.2l-3.5 2v3.2a2.5 2.5 0 0 0 1.2 2.1l8.5 4.9a2.5 2.5 0 0 0 2.5 0l8.5-4.9a2.5 2.5 0 0 0 1.2-2.1V17.3a2.5 2.5 0 0 0-1.2-2.1L29 10.2z" />
            </svg>
            <p className="text-xs font-semibold tracking-widest uppercase opacity-90">
              {network.name}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white bg-opacity-20 rounded-full px-2 py-1">
            <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
            <span className="text-[10px] font-bold">Live</span>
          </div>
        </div>

        {/* Address */}
        <div className="mb-4">
          <p className="text-xs opacity-70 mb-1">Address</p>
          <div className="flex items-center gap-2">
            {/* Mobile: short */}
            <p className="font-mono text-sm font-semibold sm:hidden">{shortAddress}</p>
            {/* Desktop: full */}
            <p className="font-mono text-xs font-semibold hidden sm:block truncate">{address}</p>
            <button onClick={handleCopy} title="Copy address" className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity">
              {copied
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
              }
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="mb-4 rounded-xl px-3 py-3" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-70 mb-0.5">Balance</p>
              <p className="text-2xl font-black">{balance} <span className="text-sm font-bold opacity-80">{network.currency}</span></p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
              title="Refresh balance"
            >
              <svg className={refreshing ? "animate-spin" : ""} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>
          </div>
          {network.faucetUrl && (
            <a
              href={network.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] opacity-60 hover:opacity-90 underline mt-1 block"
            >
              Get test MATIC from faucet →
            </a>
          )}
        </div>

        {/* Send transaction */}
        {!showSend ? (
          <button
            onClick={() => { setShowSend(true); setTxResult(null); setSendError(""); }}
            className="w-full rounded-xl py-3 font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ background: "white", color: "#7b3fe4" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#7b3fe4">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
            Send MATIC
          </button>
        ) : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Recipient address (0x...)"
              className="rounded-xl px-3 py-2.5 text-sm font-mono outline-none"
              style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
            />
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={"Amount in " + network.currency}
              step="0.001"
              min="0"
              className="rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
            />
            {sendError && (
              <p className="text-xs text-red-300 px-1">{sendError}</p>
            )}
            {txResult && (
              <div className="rounded-xl px-3 py-2 text-xs" style={{ background: "rgba(74,222,128,0.2)" }}>
                <p className="font-bold text-green-300">✅ Sent!</p>
                <a href={txResult.url} target="_blank" rel="noopener noreferrer"
                  className="text-green-200 underline break-all">
                  {txResult.hash.slice(0, 20)}...
                </a>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={sending || !toAddress || !amount}
                className="flex-1 rounded-xl py-2.5 font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                style={{ background: "white", color: "#7b3fe4" }}
              >
                {sending ? (
                  <>
                    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7b3fe4" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Sending...
                  </>
                ) : "Confirm Send"}
              </button>
              <button
                onClick={() => { setShowSend(false); setSendError(""); setTxResult(null); }}
                className="w-10 rounded-xl font-bold text-base transition-all hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.2)", color: "white" }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-xs text-red-300 text-center">{error}</p>
        )}
      </div>
    </div>
  );
}
