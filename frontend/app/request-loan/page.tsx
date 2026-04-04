"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { borrowFromPool } from "@/services/loanService";
import { getPoolStats } from "@/services/poolService";
import { getReputation, getMaxLTV, getCreditTier } from "@/services/reputationService";
import { getEthPriceINR, formatINR, ethToINR, inrToETH } from "@/utils/getEthPrice";

const DURATION_OPTIONS = [
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
  { label: "60 Days", days: 60 },
  { label: "90 Days", days: 90 },
];

const DAILY_RATE = 0.024;

export default function RequestLoanPage() {
  const router = useRouter();
  const supabase = createClient();

  const [amount, setAmount] = useState("");
  const [durationLabel, setDurationLabel] = useState("30 Days");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableLiquidity, setAvailableLiquidity] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [creditScore, setCreditScore] = useState(500);
  const [creditTier, setCreditTier] = useState("Good");
  const [maxLTV, setMaxLTV] = useState(0.75);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/"); return; }

        const [stats, price, rep] = await Promise.all([
          getPoolStats(),
          getEthPriceINR(),
          getReputation(user.id),
        ]);

        setAvailableLiquidity(stats.total_liquidity - stats.total_borrowed);
        setEthPrice(price);
        setCreditScore(rep.credit_score);
        setCreditTier(getCreditTier(rep.credit_score));
        setMaxLTV(getMaxLTV(rep.credit_score));
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const selectedDays = DURATION_OPTIONS.find((d) => d.label === durationLabel)?.days ?? 30;
  const amountINR = amount ? parseFloat(amount) : 0;
  const amountETH = amountINR > 0 ? inrToETH(amountINR, ethPrice) : 0;
  const estInterest = amountINR ? (amountINR * (DAILY_RATE / 100) * selectedDays).toFixed(0) : "—";
  const availableLiquidityINR = ethToINR(availableLiquidity, ethPrice);
  const maxBorrowINR = availableLiquidityINR * maxLTV;

  const tierColor: Record<string, string> = {
    Excellent: "bg-[#4ade80] text-[#14532d]",
    Good: "bg-[#bfdbfe] text-[#1e40af]",
    Fair: "bg-[#fef3c7] text-[#d97706]",
    Poor: "bg-red-100 text-red-600",
  };

  const handleSubmit = async () => {
    setError("");
    if (!amount || amountINR <= 0) { setError("Enter a valid loan amount."); return; }
    if (amountINR > maxBorrowINR) {
      setError(`Amount exceeds your credit limit of ${formatINR(maxBorrowINR)} (LTV ${(maxLTV * 100).toFixed(0)}%)`);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      await borrowFromPool(user.id, amountETH, selectedDays);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to borrow from pool.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20">
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0] dark:border-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white mb-2">Borrow from Pool</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm lg:text-base leading-relaxed">
            Available: {formatINR(availableLiquidityINR)} · Your limit: {formatINR(maxBorrowINR)}
          </p>
        </div>

        {/* Credit Score Banner */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl px-5 py-4 mb-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#eef2ff] rounded-xl flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1a2fb8"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
            </div>
            <div>
              <p className="text-xs text-[#6b7280] dark:text-gray-400 font-semibold">Credit Score</p>
              <p className="text-xl font-black text-[#111827] dark:text-white">{creditScore} <span className="text-sm font-semibold text-[#6b7280] dark:text-gray-400">/ 1000</span></p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${tierColor[creditTier] ?? "bg-gray-100 text-gray-600"}`}>
              {creditTier}
            </span>
            <span className="text-xs text-[#6b7280] dark:text-gray-400">Max LTV: {(maxLTV * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Loan Amount (₹)</label>
                  <button
                    onClick={() => setAmount(Math.floor(maxBorrowINR).toString())}
                    className="text-xs font-bold text-[#1a2fb8] hover:underline"
                  >
                    Max: {formatINR(maxBorrowINR)}
                  </button>
                </div>
                <div className="flex items-center bg-[#f9fafb] dark:bg-gray-700 rounded-2xl px-4 py-4 border border-[#e5e9f0] dark:border-gray-700 gap-3">
                  <span className="text-xl font-bold text-[#6b7280] dark:text-gray-400">₹</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    step="1000"
                    className="flex-1 outline-none text-xl font-bold text-[#374151] placeholder-[#d1d5db] bg-transparent"
                  />
                  <div className="w-8 h-8 bg-[#eef2ff] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                  </div>
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-2">≈ {amountETH.toFixed(6)} ETH</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-2">Repayment Term</label>
                <div className="flex items-center bg-[#f9fafb] dark:bg-gray-700 rounded-2xl px-4 py-4 border border-[#e5e9f0] dark:border-gray-700">
                  <select
                    value={durationLabel}
                    onChange={(e) => setDurationLabel(e.target.value)}
                    className="flex-1 outline-none text-base font-semibold text-[#374151] bg-transparent appearance-none cursor-pointer"
                  >
                    {DURATION_OPTIONS.map((d) => <option key={d.label}>{d.label}</option>)}
                  </select>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280"><path d="M7 10l5 5 5-5z" /></svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !amount || amountINR <= 0}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>Borrow from Pool <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg></>
              )}
            </button>
          </div>

          <div className="w-full lg:flex-1 flex flex-col gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Loan Summary</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Requested Amount", value: amount ? formatINR(amountINR) : "—" },
                  { label: "Repayment Term", value: durationLabel },
                  { label: "Daily Rate", value: `${DAILY_RATE}%` },
                  { label: "Est. Total Interest", value: amount ? formatINR(parseFloat(estInterest)) : "—" },
                  { label: "Est. Total Repayment", value: amount ? formatINR(amountINR + parseFloat(estInterest)) : "—" },
                  { label: "Exchange Rate", value: `1 ETH = ${formatINR(ethPrice)}` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                    <span className="text-sm text-[#6b7280] dark:text-gray-400">{row.label}</span>
                    <span className="text-sm font-bold text-[#111827] dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit tier info */}
            <div className="bg-[#eef2ff] rounded-3xl p-5 border border-[#c7d2fe]">
              <p className="text-xs font-bold text-[#1a2fb8] uppercase tracking-widest mb-3">Credit Tiers</p>
              <div className="flex flex-col gap-2">
                {[
                  { tier: "Excellent", range: "> 800", ltv: "85%", active: creditScore > 800 },
                  { tier: "Good", range: "600–800", ltv: "75%", active: creditScore >= 600 && creditScore <= 800 },
                  { tier: "Fair / Poor", range: "< 600", ltv: "60%", active: creditScore < 600 },
                ].map((t) => (
                  <div key={t.tier} className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs font-semibold ${t.active ? "bg-[#1a2fb8] text-white" : "text-[#6b7280] dark:text-gray-400"}`}>
                    <span>{t.tier} ({t.range})</span>
                    <span>Max LTV {t.ltv}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Navbar />
    </div>
  );
}

