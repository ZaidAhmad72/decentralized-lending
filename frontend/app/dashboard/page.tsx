"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/wallet/walletHooks";
import Navbar from "@/components/Navbar";
import WalletCard from "@/components/WalletCard";
import Chatbot from "@/components/Chatbot";
import { createClient } from "@/utils/supabase/client";
import { getUserActiveLoan, type Loan } from "@/services/loanService";
import { getPoolStats, getUserTotalDeposited } from "@/services/poolService";
import { getReputation, getCreditTier, getMaxLTV, getScoreBreakdown } from "@/services/reputationService";
import { getEthPriceINR, formatINR, ethToINR } from "@/utils/getEthPrice";
import CreditScoreDisplay from "@/components/CreditScoreDisplay";
import { calculateHealthFactor, formatHealthFactor, getHealthFactorColor } from "@/services/creditScoreService";
import type { ScoreBreakdown as ScoreBreakdownType } from "@/services/creditScoreService";
import { createClient as createSupabaseClient } from "@/utils/supabase/client";
import { getFraudProfile, type FraudProfile } from "@/services/fraudDetection";
import { BlacklistBanner, FraudScoreCard } from "@/components/FraudBanner";

// Fetch active private pool loans for the user (filter out dust loans < 0.00001 ETH)
async function getUserActivePrivateLoans(userId: string) {
  const sb = createSupabaseClient();
  const { data } = await sb
    .from("pool_loans")
    .select("id, amount, due_date, pool_id, private_pools(pool_name)")
    .eq("borrower_id", userId)
    .eq("status", "active")
    .gt("amount", 0.00001); // exclude dust/ghost loans
  return data ?? [];
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const { balance: walletBalance, address: walletAddress } = useWallet();

  const [profile, setProfile] = useState({ name: "" });
  const [activeLoan, setActiveLoan] = useState<Loan | null>(null);
  const [poolStats, setPoolStats] = useState({ total_liquidity: 0, total_borrowed: 0 });
  const [userDeposited, setUserDeposited] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [creditScore, setCreditScore] = useState(500);
  const [creditTier, setCreditTier] = useState("Good");
  const [maxLTV, setMaxLTV] = useState(0.75);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownType | undefined>(undefined);
  const [healthFactor, setHealthFactor] = useState<number>(Infinity);
  const [scoreDecay, setScoreDecay] = useState<number>(0);
  const [gasSaved, setGasSaved] = useState<number>(0);
  const [fraudProfile, setFraudProfile] = useState<FraudProfile>({ fraud_score: 0, fraud_flags: [], fraud_count: 0, status: "ACTIVE" });
  const [loading, setLoading] = useState(true);
  const [privateLoans, setPrivateLoans] = useState<{ id: string; amount: number; due_date: string; pool_id: string; private_pools: { pool_name: string } | null }[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      if (prof) setProfile(prof);

      const [loan, stats, deposited, price, rep, breakdown] = await Promise.all([
        getUserActiveLoan(user.id),
        getPoolStats(),
        getUserTotalDeposited(user.id),
        getEthPriceINR(),
        getReputation(user.id),
        getScoreBreakdown(user.id),
      ]);

      setActiveLoan(loan);
      setPoolStats(stats);
      setUserDeposited(deposited);
      setEthPrice(price);
      setCreditScore(rep.credit_score);
      setCreditTier(getCreditTier(rep.credit_score));
      setMaxLTV(getMaxLTV(rep.credit_score));
      setScoreBreakdown(breakdown);
      
      // Calculate health factor
      const collateralValue = prof?.wallet_balance || 0;
      const borrowedValue = loan?.amount || 0;
      const hf = calculateHealthFactor(collateralValue, borrowedValue);
      setHealthFactor(hf);
      
      // Get score decay from breakdown (if available)
      // For now, calculate based on last activity
      const { count: txCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const daysInactive = txCount === 0 ? 7 : 0;
      const decay = daysInactive > 0 ? Math.round(rep.credit_score * 0.01 * daysInactive) : 0;
      setScoreDecay(decay);
      
      // Calculate gas saved (transactions * 0.465 rupees)
      const { count: totalTx } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      setGasSaved((totalTx || 0) * 0.465);

      // Fetch active private pool loans
      const pLoans = await getUserActivePrivateLoans(user.id);
      setPrivateLoans(pLoans as typeof privateLoans);

      const fp = await getFraudProfile(user.id);
      setFraudProfile(fp);

      setLoading(false);
    };
    load();
  }, []);

  const daysLeft = activeLoan?.due_date
    ? Math.max(0, Math.ceil((new Date(activeLoan.due_date).getTime() - Date.now()) / 86400000))
    : 0;

  const poolLiquidityINR = ethToINR(poolStats.total_liquidity, ethPrice);
  const poolBorrowedINR = ethToINR(poolStats.total_borrowed, ethPrice);
  const availableLiquidityINR = poolLiquidityINR - poolBorrowedINR;
  const userDepositedINR = ethToINR(userDeposited, ethPrice);
  const activeLoanINR = activeLoan ? ethToINR(activeLoan.amount, ethPrice) : 0;

  if (loading) return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 flex items-center justify-center transition-colors">
      <p className="text-[#6b7280] dark:text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20 transition-colors">

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
          </div>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
        <div className="bg-[#1a2fb8] text-white text-xs font-bold px-3 py-1.5 rounded-full">
          {creditScore} SCORE
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">

        {/* Blacklist Banner */}
        {fraudProfile.status === "BLACKLISTED" && <BlacklistBanner />}

        {/* Welcome */}
        <div className="mb-6">
          <p className="text-[#6b7280] dark:text-gray-400 text-sm">Welcome back,</p>
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white">{profile.name || "—"}</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 mb-6">
          <div className="flex flex-col gap-4 lg:flex-1">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Pool Liquidity */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Pool Liquidity</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#111827] dark:text-white">
                    {formatINR(poolLiquidityINR)}
                  </p>
                  <p className="text-sm text-[#16a34a] font-semibold mt-1">
                    Available: {formatINR(availableLiquidityINR)}
                  </p>
                </div>
              </div>

              {/* Your Deposits */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#eef2ff] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Your Deposits</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#111827] dark:text-white">
                    {formatINR(userDepositedINR)}
                  </p>
                  <button onClick={() => router.push("/deposit")} className="text-xs text-[#1a2fb8] font-bold mt-1">Deposit more →</button>
                </div>
              </div>

              {/* Credit Score - Enhanced */}
              <div className="lg:col-span-3">
                <CreditScoreDisplay 
                  score={creditScore} 
                  tier={creditTier} 
                  breakdown={scoreBreakdown}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Active Loan */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#eef2ff] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Active Loan</span>
                </div>
                {activeLoan ? (
                  <div>
                    <p className="text-3xl font-black text-[#111827] dark:text-white">
                      {formatINR(activeLoanINR)}
                    </p>
                    <p className="text-sm text-[#16a34a] font-semibold mt-1">Due in {daysLeft} Days</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-bold text-[#9ca3af]">No active loan</p>
                    <button onClick={() => router.push("/request-loan")} className="text-xs text-[#1a2fb8] font-bold mt-1">Borrow now →</button>
                  </div>
                )}
              </div>

              {/* Loan Status */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Status</span>
                </div>
                <div>
                  <p className="text-2xl font-black text-[#111827] dark:text-white capitalize">
                    {activeLoan ? activeLoan.status : "—"}
                  </p>
                  {activeLoan && (
                    <p className="text-sm text-[#16a34a] font-semibold mt-1">
                      {activeLoan.duration_days} day term
                    </p>
                  )}
                </div>
              </div>

              {/* Private Pool Active Loans */}
              {privateLoans.length > 0 && (
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#fef3c7] dark:border-yellow-800">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 bg-[#fef3c7] rounded-lg flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#d97706"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                    </div>
                    <span className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Private Pool Loans</span>
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706]">{privateLoans.length} pending</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {privateLoans.map((pl) => {
                      const daysLeft = Math.max(0, Math.ceil((new Date(pl.due_date).getTime() - Date.now()) / 86400000));
                      const amtINR = ethToINR(pl.amount, ethPrice);
                      const poolName = (pl.private_pools as { pool_name: string } | null)?.pool_name ?? "Private Pool";
                      return (
                        <div key={pl.id} className="flex items-center justify-between py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                          <div>
                            <p className="text-sm font-bold text-[#111827] dark:text-white">{poolName}</p>
                            <p className="text-xs text-[#6b7280] dark:text-gray-400">Due in {daysLeft}d · {pl.amount.toFixed(4)} ETH</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-[#d97706]">{formatINR(amtINR)}</p>
                            <p className="text-[10px] text-[#9ca3af]">active</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-3 lg:w-72 lg:flex-shrink-0">
            <h2 className="text-xl font-black text-[#111827] dark:text-white hidden lg:block">Quick Actions</h2>

            <button
              onClick={() => router.push("/deposit")}
              className="w-full bg-[#4ade80] text-[#14532d] rounded-2xl py-5 font-bold text-lg flex items-center justify-between px-5 hover:bg-[#22c55e] transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border-2 border-[#14532d] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#14532d"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                </div>
                Deposit to Pool
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#14532d"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
            </button>

            <button
              onClick={() => router.push("/request-loan")}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-between px-5 hover:bg-[#1527a0] transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
                </div>
                Borrow from Pool
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
            </button>

            <div className="grid grid-cols-1 gap-3">
              <button onClick={() => router.push("/repay")} className="bg-[#e5e9f0] dark:bg-gray-700 text-[#374151] dark:text-white rounded-2xl py-5 font-bold text-base flex flex-col items-center gap-2 hover:bg-[#d1d5db] dark:hover:bg-gray-600 transition-all active:scale-95">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" /></svg>
                Repay Loan
              </button>
            </div>

            {/* Smart Wallet Card */}
            <WalletCard />

            {/* Fraud Risk Card */}
            <FraudScoreCard
              score={fraudProfile.fraud_score}
              fraudCount={fraudProfile.fraud_count}
              status={fraudProfile.status}
            />

            {/* Desktop: quick stats panel */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700 mt-1">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Pool & Your Stats</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Credit Score", value: `${creditScore} / 1000` },
                  { label: "Credit Tier", value: creditTier },
                  { label: "Max LTV", value: `${(maxLTV * 100).toFixed(0)}%` },
                  { 
                    label: "Health Factor", 
                    value: formatHealthFactor(healthFactor),
                    color: getHealthFactorColor(healthFactor)
                  },
                  { 
                    label: "Dynamic Score Decay", 
                    value: scoreDecay > 0 ? `−${scoreDecay} pts` : "Active",
                    color: scoreDecay > 0 ? "text-red-600" : "text-green-600"
                  },
                  { label: "Active Loan", value: activeLoan ? formatINR(activeLoanINR) : "None" },
                  { label: "Loan Status", value: activeLoan ? activeLoan.status : "—" },
                  { label: "Days Remaining", value: activeLoan ? `${daysLeft}d` : "—" },
                  { 
                    label: "Gas Saved", 
                    value: `₹${gasSaved.toFixed(2)}`,
                    color: "text-green-600"
                  },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-sm text-[#6b7280] dark:text-gray-400">{s.label}</span>
                    <span className={`text-sm font-bold capitalize ${s.color || "text-[#111827] dark:text-white"}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Chatbot context={{
        reputationScore: creditScore,
        activeLoan: activeLoan ? { amount: activeLoan.amount, status: activeLoan.status, daysLeft } : null,
        userDeposited,
        poolLiquidity: poolStats.total_liquidity,
        poolAvailable: poolStats.total_liquidity - poolStats.total_borrowed,
        walletBalance: walletBalance ?? undefined,
        walletAddress: walletAddress ?? undefined,
      }} />
      <Navbar />
    </div>
  );
}

