"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { getUserActiveLoan, repayLoan, checkAndMarkDefaulted, type Loan } from "@/services/loanService";
import { getWalletInfo } from "@/services/walletService";
import { getEthPriceINR, formatINR, ethToINR } from "@/utils/getEthPrice";
import {
  getUserAllActivePoolLoans, repayPrivatePoolLoan,
  type PoolLoanWithMeta,
} from "@/services/privatePoolService";
import { showToast } from "@/components/Toast";

type RepayUnit = "INR" | "USD" | "ETH";

export default function RepayPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [repaying, setRepaying] = useState(false);
  const [repaid, setRepaid] = useState(false);
  const [error, setError] = useState("");
  const [ethPrice, setEthPrice] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  // Public loan repay amount
  const [repayUnit, setRepayUnit] = useState<RepayUnit>("INR");
  const [repayInput, setRepayInput] = useState("");

  // Private pool loans
  const [privateLoans, setPrivateLoans] = useState<PoolLoanWithMeta[]>([]);
  const [repayingPoolLoan, setRepayingPoolLoan] = useState<string | null>(null);
  const [poolRepayMsg, setPoolRepayMsg] = useState<Record<string, string>>({});
  const [poolRepayInput, setPoolRepayInput] = useState<Record<string, string>>({});
  const [poolRepayUnit, setPoolRepayUnit] = useState<Record<string, RepayUnit>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserId(user.id);
      await checkAndMarkDefaulted(user.id);

      const [activeLoan, price, wallet, pLoans] = await Promise.all([
        getUserActiveLoan(user.id),
        getEthPriceINR(),
        getWalletInfo(user.id),
        getUserAllActivePoolLoans(user.id),
      ]);

      setLoan(activeLoan);
      setEthPrice(price);
      setWalletBalance(wallet.balance);
      setPrivateLoans(pLoans);
      setLoading(false);
    };
    load();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Convert user input (in chosen unit) to ETH */
  function toETH(value: string, unit: RepayUnit): number {
    const n = parseFloat(value) || 0;
    if (unit === "ETH") return n;
    if (unit === "INR") return ethPrice > 0 ? n / ethPrice : 0;
    // USD → ETH (approx 1 USD = 83 INR)
    return ethPrice > 0 ? (n * 83) / ethPrice : 0;
  }

  function fmtUnit(ethAmt: number, unit: RepayUnit): string {
    if (unit === "ETH") return ethAmt.toFixed(6) + " ETH";
    const inr = ethToINR(ethAmt, ethPrice);
    if (unit === "USD") return "$" + (inr / 83).toFixed(2);
    return formatINR(inr);
  }

  // ── Public loan calculations ──────────────────────────────────────────────

  const daysLeft = loan?.due_date
    ? Math.max(0, Math.ceil((new Date(loan.due_date).getTime() - Date.now()) / 86400000))
    : 0;

  const interest = loan
    ? parseFloat((loan.amount * (0.024 / 100) * loan.duration_days).toFixed(6))
    : 0;

  const totalDue = loan ? loan.amount + interest : 0;
  const totalDueINR = ethToINR(totalDue, ethPrice);

  const repayAmountETH = useMemo(() => toETH(repayInput, repayUnit), [repayInput, repayUnit, ethPrice]);
  const repayAmountINR = ethToINR(repayAmountETH, ethPrice);
  const walletINR = ethToINR(walletBalance, ethPrice);

  // ── Public loan repay ─────────────────────────────────────────────────────

  const handleRepay = async () => {
    if (!loan) return;
    const amt = repayAmountETH;
    if (!amt || amt <= 0) { setError("Enter a repay amount"); return; }
    if (amt > walletBalance) {
      setError(`Insufficient balance. Have ${formatINR(walletINR)}`);
      return;
    }
    setRepaying(true);
    setError("");
    try {
      await repayLoan(loan.id, userId, amt);
      setRepaid(true);
      setWalletBalance((prev) => prev - amt);
      showToast("success", "Loan Repaid!", `${fmtUnit(amt, repayUnit)} repaid successfully. Credit score updated.`);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Repayment failed.");
    }
    setRepaying(false);
  };

  // ── Private pool repay ────────────────────────────────────────────────────

  const handlePoolRepay = async (loanId: string) => {
    setRepayingPoolLoan(loanId);
    setPoolRepayMsg({});
    const unit = poolRepayUnit[loanId] ?? "INR";
    const input = poolRepayInput[loanId] ?? "";
    const amtETH = toETH(input, unit);

    if (!amtETH || amtETH <= 0) {
      setPoolRepayMsg((prev) => ({ ...prev, [loanId]: "❌ Enter a repay amount" }));
      setRepayingPoolLoan(null);
      return;
    }

    try {
      await repayPrivatePoolLoan(userId, loanId, amtETH);
      setPoolRepayMsg((prev) => ({ ...prev, [loanId]: "✅ Repaid " + fmtUnit(amtETH, unit) }));
      setWalletBalance((prev) => prev - amtETH);
      showToast("success", "Pool Loan Repaid!", `${fmtUnit(amtETH, unit)} repaid to ${privateLoans.find(l => l.id === loanId)?.pool_name ?? "pool"}.`);
      // Remove loan from list immediately
      setPrivateLoans((prev) => prev.filter((l) => l.id !== loanId));
    } catch (err) {
      setPoolRepayMsg((prev) => ({
        ...prev,
        [loanId]: "❌ " + (err instanceof Error ? err.message : "Repay failed"),
      }));
    }
    setRepayingPoolLoan(null);
  };

  const hasAnyLoan = loan || privateLoans.length > 0;

  if (loading) return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 flex items-center justify-center">
      <p className="text-[#6b7280] dark:text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20">
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
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white mb-2">Repay Loans</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm">
            Wallet balance: <span className="font-bold text-[#111827] dark:text-white">{formatINR(walletINR)}</span>
          </p>
        </div>

        {!hasAnyLoan ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 text-center shadow-sm border border-[#e5e9f0] dark:border-gray-700">
            <p className="text-[#111827] dark:text-white font-bold text-lg mb-2">No active loans</p>
            <p className="text-[#6b7280] dark:text-gray-400 text-sm mb-6">You don't have any loans to repay right now.</p>
            <button onClick={() => router.push("/request-loan")} className="bg-[#1a2fb8] text-white rounded-2xl px-6 py-3 font-bold text-sm">
              Request a Loan
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">

            {/* ── Public Pool Loan ── */}
            {loan && (
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-[#eef2ff] rounded-lg flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                    </div>
                    <h2 className="text-sm font-bold text-[#6b7280] dark:text-gray-400 uppercase tracking-widest">Public Pool Loan</h2>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">
                        Loan #{loan.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={"text-xs font-bold px-3 py-1 rounded-full " + (daysLeft <= 3 ? "bg-red-100 text-red-600" : "bg-[#fef3c7] text-[#d97706]")}>
                        {daysLeft} Days Left
                      </span>
                    </div>

                    {/* Loan breakdown */}
                    <div className="flex flex-col gap-1 mb-5">
                      {[
                        { label: "Principal", value: formatINR(ethToINR(loan.amount, ethPrice)) },
                        { label: "Interest (0.024%/day)", value: "+" + formatINR(ethToINR(interest, ethPrice)) },
                        { label: "Due Date", value: new Date(loan.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between py-2 border-b border-[#f3f4f6] dark:border-gray-700">
                          <span className="text-sm text-[#6b7280] dark:text-gray-400">{row.label}</span>
                          <span className="text-sm font-bold text-[#111827] dark:text-white">{row.value}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2">
                        <span className="font-bold text-[#111827] dark:text-white">Total Due</span>
                        <span className="text-xl font-black text-[#111827] dark:text-white">{formatINR(totalDueINR)}</span>
                      </div>
                    </div>

                    {/* Repay amount input */}
                    <div className="bg-[#f9fafb] dark:bg-gray-700 rounded-2xl p-4">
                      <p className="text-xs font-bold text-[#6b7280] dark:text-gray-400 uppercase tracking-widest mb-3">Repay Amount</p>
                      <div className="flex gap-2 mb-2">
                        {/* Currency selector */}
                        <div className="relative">
                          <select
                            value={repayUnit}
                            onChange={(e) => { setRepayUnit(e.target.value as RepayUnit); setRepayInput(""); }}
                            className="appearance-none bg-white dark:bg-gray-600 border border-[#e5e9f0] dark:border-gray-500 rounded-xl px-3 py-2.5 pr-7 text-sm font-bold text-[#374151] dark:text-white cursor-pointer"
                          >
                            <option value="INR">₹ INR</option>
                            <option value="USD">$ USD</option>
                            <option value="ETH">ETH</option>
                          </select>
                          <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="#6b7280"><path d="M7 10l5 5 5-5z" /></svg>
                        </div>
                        <input
                          type="number"
                          value={repayInput}
                          onChange={(e) => setRepayInput(e.target.value)}
                          placeholder={repayUnit === "INR" ? "Amount in ₹" : repayUnit === "USD" ? "Amount in $" : "Amount in ETH"}
                          step={repayUnit === "ETH" ? "0.000001" : "1"}
                          className="flex-1 rounded-xl px-3 py-2.5 text-sm border border-[#e5e9f0] dark:border-gray-500 bg-white dark:bg-gray-600 text-[#111827] dark:text-white outline-none"
                        />
                        <button
                          onClick={() => {
                            if (repayUnit === "INR") setRepayInput(totalDueINR.toFixed(0));
                            else if (repayUnit === "USD") setRepayInput(((totalDueINR) / 83).toFixed(2));
                            else setRepayInput(totalDue.toFixed(6));
                          }}
                          className="px-3 py-2.5 rounded-xl text-xs font-bold bg-[#eef2ff] text-[#1a2fb8] dark:bg-blue-950 dark:text-blue-400 whitespace-nowrap"
                        >
                          Full
                        </button>
                      </div>
                      {repayInput && repayAmountETH > 0 && repayUnit !== "ETH" && (
                        <p className="text-xs text-[#6b7280] dark:text-gray-400 px-1">≈ {repayAmountETH.toFixed(6)} ETH</p>
                      )}
                      {repayInput && repayAmountETH > 0 && repayUnit === "ETH" && (
                        <p className="text-xs text-[#6b7280] dark:text-gray-400 px-1">≈ {formatINR(repayAmountINR)}</p>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-2xl px-4 py-3">{error}</div>
                  )}

                  {repaid ? (
                    <div className="w-full bg-[#4ade80] text-[#14532d] rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#14532d"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      Repayment Successful
                    </div>
                  ) : (
                    <button
                      onClick={handleRepay}
                      disabled={repaying || !repayInput || repayAmountETH <= 0}
                      className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-50"
                    >
                      {repaying ? "Processing..." : "Repay " + (repayInput ? fmtUnit(repayAmountETH, repayUnit) : formatINR(totalDueINR))}
                    </button>
                  )}
                </div>

                <div className="w-full lg:flex-1">
                  <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
                    <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Summary</p>
                    <div className="flex flex-col gap-3">
                      {[
                        { label: "Paying now", value: repayInput ? fmtUnit(repayAmountETH, repayUnit) : "—" },
                        { label: "Remaining after", value: repayInput ? formatINR(Math.max(0, totalDueINR - repayAmountINR)) : formatINR(totalDueINR) },
                        { label: "Credit impact", value: daysLeft > 0 ? "Positive ✓" : "Minor ✓", green: true },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                          <span className="text-sm text-[#6b7280] dark:text-gray-400">{row.label}</span>
                          <span className={"text-sm font-bold " + (row.green ? "text-green-600" : "text-[#111827] dark:text-white")}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Private Pool Loans ── */}
            {privateLoans.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#fef3c7] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#d97706"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
                  </div>
                  <h2 className="text-sm font-bold text-[#6b7280] dark:text-gray-400 uppercase tracking-widest">Private Pool Loans</h2>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706]">{privateLoans.length} active</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {privateLoans.map((pl) => {
                    const dLeft = Math.max(0, Math.ceil((new Date(pl.due_date).getTime() - Date.now()) / 86400000));
                    const plInterest = pl.amount * (pl.interest_rate / 100) * pl.duration_days;
                    const plTotal = pl.amount + plInterest;
                    const plTotalINR = ethToINR(plTotal, ethPrice);
                    const msg = poolRepayMsg[pl.id];
                    const unit = poolRepayUnit[pl.id] ?? "INR";
                    const input = poolRepayInput[pl.id] ?? "";
                    const amtETH = toETH(input, unit);

                    return (
                      <div key={pl.id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#1a2fb8] to-[#4f46e5] flex items-center justify-center text-white font-black text-xs">
                              {pl.pool_name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-[#111827] dark:text-white text-sm">{pl.pool_name}</p>
                              <p className="text-xs text-[#6b7280] dark:text-gray-400">Borrowed by {pl.borrower_name}</p>
                            </div>
                          </div>
                          <span className={"text-xs font-bold px-2 py-1 rounded-full " + (dLeft <= 3 ? "bg-red-100 text-red-600" : "bg-[#fef3c7] text-[#d97706]")}>
                            {dLeft}d left
                          </span>
                        </div>

                        {/* Breakdown */}
                        <div className="flex flex-col gap-1 mb-4">
                          {[
                            { label: "Principal", value: formatINR(ethToINR(pl.amount, ethPrice)) },
                            { label: "Interest", value: "+" + formatINR(ethToINR(plInterest, ethPrice)) },
                            { label: "Due Date", value: new Date(pl.due_date).toLocaleDateString() },
                          ].map((row) => (
                            <div key={row.label} className="flex justify-between py-1.5 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                              <span className="text-xs text-[#6b7280] dark:text-gray-400">{row.label}</span>
                              <span className="text-xs font-bold text-[#111827] dark:text-white">{row.value}</span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2">
                            <span className="text-sm font-bold text-[#111827] dark:text-white">Total Due</span>
                            <span className="text-lg font-black text-[#111827] dark:text-white">{formatINR(plTotalINR)}</span>
                          </div>
                        </div>

                        {/* Repay amount input */}
                        <div className="bg-[#f9fafb] dark:bg-gray-700 rounded-xl p-3 mb-3">
                          <div className="flex gap-2 mb-1">
                            <div className="relative">
                              <select
                                value={unit}
                                onChange={(e) => setPoolRepayUnit((prev) => ({ ...prev, [pl.id]: e.target.value as RepayUnit }))}
                                className="appearance-none bg-white dark:bg-gray-600 border border-[#e5e9f0] dark:border-gray-500 rounded-xl px-2 py-2 pr-6 text-xs font-bold text-[#374151] dark:text-white cursor-pointer"
                              >
                                <option value="INR">₹</option>
                                <option value="USD">$</option>
                                <option value="ETH">ETH</option>
                              </select>
                              <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="#6b7280"><path d="M7 10l5 5 5-5z" /></svg>
                            </div>
                            <input
                              type="number"
                              value={input}
                              onChange={(e) => setPoolRepayInput((prev) => ({ ...prev, [pl.id]: e.target.value }))}
                              placeholder={unit === "INR" ? "Amount ₹" : unit === "USD" ? "Amount $" : "Amount ETH"}
                              step={unit === "ETH" ? "0.000001" : "1"}
                              className="flex-1 rounded-xl px-2 py-2 text-xs border border-[#e5e9f0] dark:border-gray-500 bg-white dark:bg-gray-600 text-[#111827] dark:text-white outline-none"
                            />
                            <button
                              onClick={() => {
                                const full = unit === "INR" ? plTotalINR.toFixed(0) : unit === "USD" ? (plTotalINR / 83).toFixed(2) : plTotal.toFixed(6);
                                setPoolRepayInput((prev) => ({ ...prev, [pl.id]: full }));
                              }}
                              className="px-2 py-2 rounded-xl text-xs font-bold bg-[#eef2ff] text-[#1a2fb8] dark:bg-blue-950 dark:text-blue-400"
                            >
                              Full
                            </button>
                          </div>
                          {input && amtETH > 0 && unit !== "ETH" && (
                            <p className="text-[10px] text-[#9ca3af] px-1">≈ {amtETH.toFixed(6)} ETH</p>
                          )}
                          {input && amtETH > 0 && unit === "ETH" && (
                            <p className="text-[10px] text-[#9ca3af] px-1">≈ {formatINR(ethToINR(amtETH, ethPrice))}</p>
                          )}
                        </div>

                        {msg ? (
                          <p className={"text-sm font-bold text-center py-2 " + (msg.startsWith("✅") ? "text-green-600" : "text-red-500")}>{msg}</p>
                        ) : (
                          <button
                            onClick={() => handlePoolRepay(pl.id)}
                            disabled={repayingPoolLoan === pl.id || !input || amtETH <= 0}
                            className="w-full py-3 rounded-2xl font-bold text-sm bg-[#1a2fb8] text-white hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-50"
                          >
                            {repayingPoolLoan === pl.id ? "Processing..." : "Repay " + (input && amtETH > 0 ? fmtUnit(amtETH, unit) : formatINR(plTotalINR))}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}
