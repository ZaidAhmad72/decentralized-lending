"use client";

import { useState } from "react";

interface LoanCardProps {
  loanId: string;
  borrower: string;
  amount: number;
  reason: string;
  duration: string;
  score: number;
  walletAddress?: string;
  onConfirmFund?: (interestRate: string) => void;
  onFundViaWallet?: (interestRate: string) => Promise<void>;
}

export default function LoanCard({ loanId, borrower, amount, reason, duration, score, walletAddress, onConfirmFund, onFundViaWallet }: LoanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState("");

  const handleConfirm = () => {
    const parsed = parseFloat(rate);
    if (!rate || isNaN(parsed) || parsed <= 0 || parsed > 100) {
      setError("Enter a valid rate between 0.01% and 100%");
      return;
    }
    setError("");
    onConfirmFund?.(rate);
  };

  const handleFundViaWallet = async () => {
    const parsed = parseFloat(rate);
    if (!rate || isNaN(parsed) || parsed <= 0 || parsed > 100) {
      setError("Enter a valid rate between 0.01% and 100%");
      return;
    }
    if (!onFundViaWallet) return;
    setError("");
    setTxStatus("pending");
    try {
      await onFundViaWallet(rate);
      setTxStatus("success");
    } catch (err) {
      setTxStatus("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-[#e5e9f0] dark:border-gray-700 overflow-hidden transition-colors">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1a2fb8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {borrower.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-[#111827] dark:text-white text-sm">{borrower}</p>
              <p className="text-xs text-[#6b7280] dark:text-gray-400">{duration} · Score {score}</p>
              {walletAddress && (
                <p className="text-[10px] text-[#9ca3af] dark:text-gray-500 font-mono mt-0.5">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#111827] dark:text-white text-base">${amount.toLocaleString()}</p>
            <p className="text-xs text-[#6b7280] dark:text-gray-400">USDC</p>
          </div>
        </div>
        <p className="text-sm text-[#6b7280] dark:text-gray-400 mb-4 line-clamp-2">{reason}</p>

        <button
          onClick={() => { setExpanded(!expanded); setError(""); setTxStatus("idle"); }}
          className="w-full bg-[#1a2fb8] text-white rounded-xl py-3 font-semibold text-sm hover:bg-[#1527a0] transition-all active:scale-95"
        >
          {expanded ? "Cancel" : "Fund Loan"}
        </button>
      </div>

      {/* Expanded interest rate input */}
      {expanded && (
        <div className="border-t border-[#f3f4f6] dark:border-gray-700 bg-[#f9fafb] dark:bg-gray-900 px-4 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#374151] dark:text-gray-300 uppercase tracking-widest">Set Your Interest Rate</p>
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl border border-[#e5e9f0] dark:border-gray-700 px-4 py-3 gap-2">
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={rate}
              onChange={(e) => { setRate(e.target.value); setError(""); }}
              placeholder="e.g. 5.5"
              className="flex-1 outline-none text-base font-semibold text-[#111827] dark:text-white placeholder-[#9ca3af] dark:placeholder-gray-500 bg-transparent"
            />
            <span className="text-[#6b7280] dark:text-gray-400 font-bold text-sm">%</span>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={handleConfirm}
            className="w-full bg-[#4ade80] text-[#14532d] rounded-xl py-3 font-bold text-sm hover:bg-[#22c55e] transition-all active:scale-95"
          >
            Confirm Fund at {rate ? `${rate}%` : "—"}
          </button>

          {onFundViaWallet && txStatus !== "success" && (
            <button
              onClick={handleFundViaWallet}
              disabled={txStatus === "pending"}
              className="w-full bg-[#1a2fb8] text-white rounded-xl py-3 font-bold text-sm hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {txStatus === "pending" ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Transaction pending...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                  Fund via Wallet
                </>
              )}
            </button>
          )}

          {txStatus === "success" && (
            <div className="flex items-center gap-2 bg-[#f0fdf4] dark:bg-green-950 rounded-xl px-4 py-3 border border-[#bbf7d0] dark:border-green-800">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#15803d">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-[#15803d] dark:text-green-400">Transaction successful</p>
                {txHash && <p className="text-[10px] text-[#6b7280] dark:text-gray-400 font-mono">{txHash.slice(0, 20)}...</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
