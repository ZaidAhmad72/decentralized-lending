"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { depositToPool, getPoolStats, getUserTotalDeposited } from "@/services/poolService";

export default function DepositPage() {
  const router = useRouter();
  const supabase = createClient();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [poolStats, setPoolStats] = useState({ total_liquidity: 0, total_borrowed: 0 });
  const [userDeposited, setUserDeposited] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      try {
        const stats = await getPoolStats();
        setPoolStats(stats);
        const deposited = await getUserTotalDeposited(user.id);
        setUserDeposited(deposited);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleDeposit = async () => {
    setError("");
    setSuccess(false);

    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      await depositToPool(user.id, parseFloat(amount));
      setSuccess(true);
      setAmount("");

      // Refresh stats
      const stats = await getPoolStats();
      setPoolStats(stats);
      const deposited = await getUserTotalDeposited(user.id);
      setUserDeposited(deposited);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Deposit failed.");
    }
    setLoading(false);
  };

  const availableLiquidity = poolStats.total_liquidity - poolStats.total_borrowed;

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
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white mb-2">Deposit to Pool</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm lg:text-base leading-relaxed">
            Add liquidity to the lending pool and enable borrowers to access capital.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col gap-5 transition-colors">
              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-2">Deposit Amount (USDC)</label>
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
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm rounded-2xl px-4 py-3">
                Deposit successful! Pool liquidity updated.
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={loading}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-70"
            >
              {loading ? "Processing..." : "Deposit to Pool"}
              {!loading && <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>}
            </button>
          </div>

          <div className="w-full lg:flex-1 flex flex-col gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 transition-colors">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Pool Statistics</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Total Liquidity", value: `$${poolStats.total_liquidity.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                  { label: "Total Borrowed", value: `$${poolStats.total_borrowed.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                  { label: "Available Liquidity", value: `$${availableLiquidity.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                  { label: "Your Total Deposited", value: `$${userDeposited.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                    <span className="text-sm text-[#6b7280] dark:text-gray-400">{row.label}</span>
                    <span className="text-sm font-bold text-[#111827] dark:text-white">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#f0fdf4] rounded-3xl p-6 border border-[#bbf7d0] flex items-start gap-4">
              <div className="w-10 h-10 bg-[#4ade80] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#14532d"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#15803d] mb-1">Earn Yield on Deposits</p>
                <p className="text-xs text-[#16a34a] leading-relaxed">
                  Your deposits enable borrowers to access capital. Interest from loans will be distributed to lenders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Navbar />
    </div>
  );
}
