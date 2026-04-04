"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { depositToPool, getPoolStats, getUserTotalDeposited } from "@/services/poolService";
import { getWalletInfo, simulateTransaction } from "@/services/walletService";
import { getEthPriceINR, formatINR, ethToINR, inrToETH } from "@/utils/getEthPrice";

export default function DepositPage() {
  const router = useRouter();
  const supabase = createClient();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success">("idle");
  const [txHash, setTxHash] = useState("");
  const [poolStats, setPoolStats] = useState({ total_liquidity: 0, total_borrowed: 0 });
  const [userDeposited, setUserDeposited] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      try {
        const stats = await getPoolStats();
        setPoolStats(stats);
        const deposited = await getUserTotalDeposited(user.id);
        setUserDeposited(deposited);
        const wallet = await getWalletInfo(user.id);
        setWalletBalance(wallet.balance);
        const price = await getEthPriceINR();
        setEthPrice(price);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  const handleDeposit = async () => {
    setError("");
    setSuccess(false);

    const depositAmountINR = parseFloat(amount);
    if (!amount || depositAmountINR <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    // Convert INR to ETH
    const depositAmountETH = inrToETH(depositAmountINR, ethPrice);
    const walletBalanceINR = ethToINR(walletBalance, ethPrice);

    if (depositAmountINR > walletBalanceINR) {
      setError(`Insufficient wallet balance. Available: ${formatINR(walletBalanceINR)}`);
      return;
    }

    setLoading(true);
    setTxStatus("pending");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      // Simulate transaction
      const hash = await simulateTransaction("deposit");
      setTxHash(hash);

      // Deposit in ETH (backend stores ETH)
      await depositToPool(user.id, depositAmountETH);
      setTxStatus("success");
      setSuccess(true);
      setAmount("");

      // Refresh stats
      const stats = await getPoolStats();
      setPoolStats(stats);
      const deposited = await getUserTotalDeposited(user.id);
      setUserDeposited(deposited);
      const wallet = await getWalletInfo(user.id);
      setWalletBalance(wallet.balance);

      setTimeout(() => {
        setSuccess(false);
        setTxStatus("idle");
      }, 5000);
    } catch (err: unknown) {
      setTxStatus("idle");
      setError(err instanceof Error ? err.message : "Deposit failed.");
    }
    setLoading(false);
  };

  const handleMaxDeposit = () => {
    const maxINR = ethToINR(walletBalance, ethPrice);
    setAmount(Math.floor(maxINR).toString());
  };

  const walletBalanceINR = ethToINR(walletBalance, ethPrice);
  const poolLiquidityINR = ethToINR(poolStats.total_liquidity, ethPrice);
  const poolBorrowedINR = ethToINR(poolStats.total_borrowed, ethPrice);
  const availableLiquidityINR = poolLiquidityINR - poolBorrowedINR;
  const userDepositedINR = ethToINR(userDeposited, ethPrice);

  const availableLiquidity = poolStats.total_liquidity - poolStats.total_borrowed;

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
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white mb-2">Deposit to Pool</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm lg:text-base leading-relaxed">
            Add liquidity to the lending pool and enable borrowers to access capital.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Deposit Amount (₹)</label>
                  <button
                    onClick={handleMaxDeposit}
                    className="text-xs font-bold text-[#1a2fb8] hover:underline"
                  >
                    Max: {formatINR(walletBalanceINR)}
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
                  <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-2">
                    ≈ {inrToETH(parseFloat(amount), ethPrice).toFixed(6)} ETH
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#15803d">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <p className="text-sm font-bold text-green-600">Transaction Confirmed!</p>
                </div>
                {txHash && (
                  <p className="text-xs text-green-600 font-mono break-all">
                    {txHash}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > walletBalanceINR}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {txStatus === "pending" ? (
                <>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Transaction Pending...
                </>
              ) : (
                <>
                  Deposit to Pool
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                </>
              )}
            </button>
          </div>

          <div className="w-full lg:flex-1 flex flex-col gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Pool Statistics</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Total Liquidity", value: formatINR(poolLiquidityINR) },
                  { label: "Total Borrowed", value: formatINR(poolBorrowedINR) },
                  { label: "Available Liquidity", value: formatINR(availableLiquidityINR) },
                  { label: "Your Total Deposited", value: formatINR(userDepositedINR) },
                  { label: "Exchange Rate", value: `1 ETH = ${formatINR(ethPrice)}` },
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

