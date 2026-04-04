"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { borrowFromPool } from "@/services/loanService";
import { getPoolStats } from "@/services/poolService";

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
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableLiquidity, setAvailableLiquidity] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const stats = await getPoolStats();
        setAvailableLiquidity(stats.total_liquidity - stats.total_borrowed);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const selectedDays = DURATION_OPTIONS.find((d) => d.label === durationLabel)?.days ?? 30;
  const estInterest = amount ? (parseFloat(amount) * (DAILY_RATE / 100) * selectedDays).toFixed(2) : "—";

  const handleSubmit = async () => {
    setError("");
    if (!amount || parseFloat(amount) <= 0) { setError("Enter a valid loan amount."); return; }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      await borrowFromPool(user.id, parseFloat(amount), selectedDays);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to borrow from pool.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20 transition-colors">
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0] dark:border-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white mb-2">Borrow from Pool</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm lg:text-base leading-relaxed">
            Borrow instantly from the lending pool. Available: ${availableLiquidity.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col gap-5 transition-colors">
              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-2">Loan Amount (USDC)</label>
                <div className="flex items-center bg-[#f9fafb] dark:bg-gray-700 rounded-2xl px-4 py-4 border border-[#e5e9f0] dark:border-gray-600 gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 outline-none text-xl font-bold text-[#374151] dark:text-gray-100 placeholder-[#d1d5db] dark:placeholder-gray-500 bg-transparent"
                  />
                  <div className="w-8 h-8 bg-[#eef2ff] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-2">Repayment Term</label>
                <div className="flex items-center bg-[#f9fafb] dark:bg-gray-700 rounded-2xl px-4 py-4 border border-[#e5e9f0] dark:border-gray-600">
                  <select
                    value={durationLabel}
                    onChange={(e) => setDurationLabel(e.target.value)}
                    className="flex-1 outline-none text-base font-semibold text-[#374151] dark:text-gray-100 bg-transparent dark:bg-transparent appearance-none cursor-pointer"
                  >
                    {DURATION_OPTIONS.map((d) => <option key={d.label}>{d.label}</option>)}
                  </select>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280"><path d="M7 10l5 5 5-5z" /></svg>
                </div>
              </div>


            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? "Processing..." : "Borrow from Pool"}
              {!loading && <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>}
            </button>
          </div>

          <div className="w-full lg:flex-1 flex flex-col gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col items-center text-center transition-colors">
              <div className="w-14 h-14 bg-[#4ade80] rounded-2xl flex items-center justify-center mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#14532d"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" /></svg>
              </div>
              <h3 className="text-lg font-black text-[#111827] dark:text-white mb-2">Instant Pool Borrowing</h3>
              <p className="text-sm text-[#6b7280] dark:text-gray-400 leading-relaxed">
                Borrow directly from the shared liquidity pool. Funds are available instantly if liquidity permits.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 transition-colors">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Loan Summary</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Requested Amount", value: amount ? `$${parseFloat(amount).toLocaleString()}` : "—" },
                  { label: "Repayment Term", value: durationLabel },
                  { label: "Daily Rate", value: `${DAILY_RATE}%` },
                  { label: "Est. Total Interest", value: amount ? `$${estInterest}` : "—" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                    <span className="text-sm text-[#6b7280] dark:text-gray-400">{row.label}</span>
                    <span className="text-sm font-bold text-[#111827] dark:text-white">{row.value}</span>
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
