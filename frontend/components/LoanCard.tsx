"use client";

import { useState } from "react";

interface LoanCardProps {
  loanId: string;
  borrower: string;
  amount: number;
  reason: string;
  duration: string;
  score: number;
  onConfirmFund?: (interestRate: string) => void;
}

export default function LoanCard({ loanId, borrower, amount, reason, duration, score, onConfirmFund }: LoanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    const parsed = parseFloat(rate);
    if (!rate || isNaN(parsed) || parsed <= 0 || parsed > 100) {
      setError("Enter a valid rate between 0.01% and 100%");
      return;
    }
    setError("");
    onConfirmFund?.(rate);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#e5e9f0] overflow-hidden">
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1a2fb8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {borrower.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-[#111827] text-sm">{borrower}</p>
              <p className="text-xs text-[#6b7280]">{duration} · Score {score}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#111827] text-base">${amount.toLocaleString()}</p>
            <p className="text-xs text-[#6b7280]">USDC</p>
          </div>
        </div>
        <p className="text-sm text-[#6b7280] mb-4 line-clamp-2">{reason}</p>

        <button
          onClick={() => { setExpanded(!expanded); setError(""); }}
          className="w-full bg-[#1a2fb8] text-white rounded-xl py-3 font-semibold text-sm hover:bg-[#1527a0] transition-all active:scale-95"
        >
          {expanded ? "Cancel" : "Fund Loan"}
        </button>
      </div>

      {/* Expanded interest rate input */}
      {expanded && (
        <div className="border-t border-[#f3f4f6] bg-[#f9fafb] px-4 py-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest">Set Your Interest Rate</p>
          <div className="flex items-center bg-white rounded-xl border border-[#e5e9f0] px-4 py-3 gap-2">
            <input
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={rate}
              onChange={(e) => { setRate(e.target.value); setError(""); }}
              placeholder="e.g. 5.5"
              className="flex-1 outline-none text-base font-semibold text-[#111827] placeholder-[#9ca3af] bg-transparent"
            />
            <span className="text-[#6b7280] font-bold text-sm">%</span>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleConfirm}
            className="w-full bg-[#4ade80] text-[#14532d] rounded-xl py-3 font-bold text-sm hover:bg-[#22c55e] transition-all active:scale-95"
          >
            Confirm Fund at {rate ? `${rate}%` : "—"}
          </button>
        </div>
      )}
    </div>
  );
}
