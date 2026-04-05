"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getPoolMembers, getPoolLoans, getPoolTransactions,
  depositToPrivatePool, borrowFromPrivatePool, repayPrivatePoolLoan,
  approveMember, getPoolWithTrustScore, getPoolAnalytics, deletePrivatePool,
  type PrivatePool, type PoolMember, type PoolLoan, type PoolTransaction,
} from "@/services/privatePoolService";
import type { PoolTrustScore, PoolAnalytics } from "@/services/privatePoolService";
import { createClient } from "@/utils/supabase/client";
import { getEthPriceINR, formatINR, ethToINR } from "@/utils/getEthPrice";
import {
  CryptoSymbol, CRYPTO_CONFIGS, RISK_LABELS, RISK_COLORS,
  getStepForCrypto, formatCryptoAmount,
} from "@/utils/cryptoConfig";
import {
  fetchCryptoPrices, getCryptoPrice, cryptoToINR, inrToCrypto,
} from "@/utils/cryptoPriceService";
import { cryptoToETH } from "@/utils/cryptoConverter";
import { useWallet } from "@/wallet/walletHooks";

interface Props {
  pool: PrivatePool;
  userId: string;
  onDeleted?: () => void;
}

type Tab = "overview" | "members" | "loans" | "transactions";
type Currency = "INR" | "USD" | "ETH";

export default function PrivatePoolCard({ pool: initialPool, userId, onDeleted }: Props) {
  const supabase = createClient();
  const [pool, setPool] = useState(initialPool);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [loans, setLoans] = useState<PoolLoan[]>([]);
  const [transactions, setTransactions] = useState<PoolTransaction[]>([]);
  const [trustScore, setTrustScore] = useState<PoolTrustScore | null>(null);
  const [analytics, setAnalytics] = useState<PoolAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  // Wallet + price state — use dbBalance from wallet context (stays in sync globally)
  const [ethPrice, setEthPrice] = useState(0);
  const [cryptoPrices, setCryptoPrices] = useState<Record<CryptoSymbol, number>>({} as Record<CryptoSymbol, number>);

  // Deposit state
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSymbol>("ETH");
  const [depositAmount, setDepositAmount] = useState("");

  // Borrow state
  const [borrowAmount, setBorrowAmount] = useState("");
  const [borrowDays, setBorrowDays] = useState("7");
  type BorrowCurrency = "ETH" | "INR" | "USD";
  const [borrowCurrency, setBorrowCurrency] = useState<BorrowCurrency>("ETH");

  // UI state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Repay state (for active loan in overview)
  const [repayUnit, setRepayUnit] = useState<"INR" | "USD" | "ETH">("INR");
  const [repayInput, setRepayInput] = useState("");

  const isCreator = pool.creator_id === userId;
  const { refreshBalance: refreshWallet, dbBalance } = useWallet();

  // ── Currency toggle ───────────────────────────────────────────────────────
  const [currency, setCurrency] = useState<Currency>("INR");

  const USD_RATE = ethPrice / 83; // approx INR→USD

  function fmtAmt(ethAmt: number): string {
    if (currency === "ETH") return ethAmt.toFixed(6) + " ETH";
    const inr = ethToINR(ethAmt, ethPrice);
    if (currency === "USD") return "$" + (inr / 83).toFixed(2);
    return formatINR(Math.round(inr)); // round to nearest ₹ to avoid floating point display
  }

  // Convert borrow input to ETH for the backend
  const borrowAmountETH = useMemo(() => {
    const amt = parseFloat(borrowAmount) || 0;
    if (!amt) return 0;
    if (borrowCurrency === "ETH") return amt;
    if (borrowCurrency === "INR") return ethPrice > 0 ? amt / ethPrice : 0;
    // USD → INR → ETH
    return ethPrice > 0 ? (amt * 83) / ethPrice : 0;
  }, [borrowAmount, borrowCurrency, ethPrice]);

  // Convert repay input to ETH
  const repayAmountETH = useMemo(() => {
    const amt = parseFloat(repayInput) || 0;
    if (!amt) return 0;
    if (repayUnit === "ETH") return amt;
    if (repayUnit === "INR") return ethPrice > 0 ? amt / ethPrice : 0;
    return ethPrice > 0 ? (amt * 83) / ethPrice : 0;
  }, [repayInput, repayUnit, ethPrice]);

  // ── Load wallet + prices ──────────────────────────────────────────────────

  useEffect(() => {
    if (!expanded) return;
    const load = async () => {
      const [price, priceResult] = await Promise.all([
        getEthPriceINR().catch(() => 0),
        fetchCryptoPrices().catch(() => ({ prices: {} as Record<CryptoSymbol, number> })),
      ]);
      setEthPrice(price);
      setCryptoPrices(priceResult.prices);
    };
    load();
  }, [expanded, userId]);

  // ── Derived deposit values ────────────────────────────────────────────────

  const currentPrice = useMemo(() => getCryptoPrice(selectedCrypto, cryptoPrices), [selectedCrypto, cryptoPrices]);

  const depositINR = useMemo(() => {
    const amt = parseFloat(depositAmount) || 0;
    return cryptoToINR(amt, selectedCrypto, cryptoPrices);
  }, [depositAmount, selectedCrypto, cryptoPrices]);

  const maxDepositCrypto = useMemo(() => {
    if (currentPrice === 0) return 0;
    const walletINR = ethToINR(dbBalance, ethPrice);
    return inrToCrypto(walletINR, selectedCrypto, cryptoPrices);
  }, [dbBalance, ethPrice, selectedCrypto, cryptoPrices, currentPrice]);

  // ── Load pool data ────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l, t, { trustScore: ts, pool: p }, a] = await Promise.all([
        getPoolMembers(pool.id),
        getPoolLoans(pool.id),
        getPoolTransactions(pool.id),
        getPoolWithTrustScore(pool.id),
        getPoolAnalytics(pool.id),
      ]);
      setMembers(m);
      setLoans(l);
      setTransactions(t);
      setTrustScore(ts);
      setAnalytics(a);
      setPool(p);
    } catch { /* silent */ }
    setLoading(false);
  }, [pool.id]);

  // Fetch pool from server API — bypasses Supabase JS client cache completely
  const refreshPoolOnly = useCallback(async () => {
    try {
      const res = await fetch("/api/pool?id=" + pool.id, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setPool(data as PrivatePool);
      }
    } catch { /* silent */ }
  }, [pool.id]);

  useEffect(() => {
    if (expanded) loadData();
  }, [expanded, loadData]);

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setActionError(msg); setActionMsg(""); }
    else { setActionMsg(msg); setActionError(""); }
    setTimeout(() => { setActionMsg(""); setActionError(""); }, 4000);
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) { showMsg("Enter a valid amount", true); return; }
    if (depositINR > ethToINR(dbBalance, ethPrice)) {
      showMsg("Insufficient wallet balance", true); return;
    }
    setActionLoading(true);
    try {
      const amtETH = cryptoToETH(amt, selectedCrypto, cryptoPrices, ethPrice);
      await depositToPrivatePool(userId, pool.id, amtETH);
      // No optimistic update — refreshPoolOnly fetches real value from server
      showMsg(`✅ Deposited ${formatCryptoAmount(amt, selectedCrypto)} ${selectedCrypto} (≈ ${formatINR(depositINR)})`);
      setDepositAmount("");
      await refreshWallet();
      await new Promise((r) => setTimeout(r, 500));
      await refreshPoolOnly();
      setTimeout(() => loadData(), 1500);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Deposit failed", true);
    }
    setActionLoading(false);
  };

  const handleBorrow = async () => {
    const days = parseInt(borrowDays);
    if (!borrowAmountETH || borrowAmountETH <= 0) { showMsg("Enter a valid amount", true); return; }
    if (!days || days <= 0) { showMsg("Enter valid duration", true); return; }
    setActionLoading(true);
    try {
      const { creditWeight, flags } = await borrowFromPrivatePool(userId, pool.id, borrowAmountETH, days);
      // No optimistic update — refreshPoolOnly fetches real value from server
      const displayAmt = borrowCurrency === "ETH"
        ? borrowAmountETH.toFixed(4) + " ETH"
        : borrowCurrency === "INR"
          ? formatINR(parseFloat(borrowAmount))
          : "$" + parseFloat(borrowAmount).toFixed(2);
      let msg = `✅ Borrowed ${displayAmt}`;
      if (creditWeight === 0) msg += " (no credit impact — abuse filter)";
      else if (creditWeight < 0.1) msg += ` (${(creditWeight * 100).toFixed(0)}% credit weight)`;
      if (flags.length > 0) msg += ` [${flags.join(", ")}]`;
      showMsg(msg);
      setBorrowAmount("");
      await refreshWallet();
      // Wait for DB to commit, then fetch fresh from server
      await new Promise((r) => setTimeout(r, 500));
      await refreshPoolOnly();
      setTimeout(() => loadData(), 1500);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Borrow failed", true);
    }
    setActionLoading(false);
  };

  const handleRepay = async (loanId: string) => {
    setActionLoading(true);
    try {
      const loanAmt = loans.find((l) => l.id === loanId)?.amount ?? 0;
      const amtToRepay = repayAmountETH > 0 ? repayAmountETH : undefined;
      const isFullRepay = !amtToRepay || Math.abs(amtToRepay - loanAmt) < 0.000001;

      await repayPrivatePoolLoan(userId, loanId, amtToRepay);
      // Immediately update loan state in UI
      if (isFullRepay) {
        setLoans((prev) => prev.map((l) =>
          l.id === loanId ? { ...l, status: "repaid" as const } : l
        ));
      } else {
        // Partial — reduce amount
        setLoans((prev) => prev.map((l) =>
          l.id === loanId ? { ...l, amount: Math.max(0, l.amount - (amtToRepay ?? 0)) } : l
        ));
      }

      setPool((prev) => ({ ...prev, total_borrowed: Math.max(0, prev.total_borrowed - (amtToRepay ?? loanAmt)) }));
      showMsg("✅ Repaid " + (amtToRepay ? fmtAmt(amtToRepay) : fmtAmt(loanAmt)));
      setRepayInput("");
      await refreshWallet();
      await new Promise((r) => setTimeout(r, 500));
      await refreshPoolOnly();
      setTimeout(() => loadData(), 1500);
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Repay failed", true);
    }
    setActionLoading(false);
  };

  const handleApprove = async (memberId: string, approve: boolean) => {
    try {
      await approveMember(userId, pool.id, memberId, approve);
      loadData();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Action failed", true);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePrivatePool(userId, pool.id);
      onDeleted?.();
    } catch (err) {
      showMsg(err instanceof Error ? err.message : "Delete failed", true);
      setShowDeleteConfirm(false);
    }
    setDeleting(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(pool.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeLoan = loans.find((l) => l.borrower_id === userId && l.status === "active" && l.amount >= 0.00001);
  const available = pool.total_liquidity - pool.total_borrowed;
  const trustColor = trustScore
    ? trustScore.score >= 80 ? "text-green-600" : trustScore.score >= 60 ? "text-blue-600" : trustScore.score >= 40 ? "text-yellow-600" : "text-gray-500"
    : "text-gray-400";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-[#e5e9f0] dark:border-gray-700 overflow-hidden">

      {/* Pool Header */}
      <div className="p-5 flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1a2fb8] to-[#4f46e5] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {pool.pool_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[#111827] dark:text-white">{pool.pool_name}</p>
              {isCreator && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#1a2fb8] dark:bg-blue-950 dark:text-blue-400">CREATOR</span>
              )}
              {trustScore && (
                <span className={`text-[10px] font-bold ${trustColor}`}>{trustScore.label} ({trustScore.score}/100)</span>
              )}
            </div>
            <p className="text-xs text-[#6b7280] dark:text-gray-400">
              {fmtAmt(pool.total_liquidity)} · {fmtAmt(available)} available
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Currency toggle */}
          <div className="flex items-center bg-[#f3f4f6] dark:bg-gray-700 rounded-xl p-0.5">
            {(["INR", "USD", "ETH"] as Currency[]).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                  currency === c
                    ? "bg-white dark:bg-gray-900 text-[#1a2fb8] dark:text-blue-400 shadow-sm"
                    : "text-[#6b7280] dark:text-gray-400"
                }`}
              >
                {c === "INR" ? "₹" : c === "USD" ? "$" : "ETH"}
              </button>
            ))}
          </div>
          {/* Delete button — creator only */}
          {isCreator && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete pool"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
              </svg>
            </button>
          )}
          <button onClick={() => setExpanded(!expanded)}>
            <svg className={`transition-transform ${expanded ? "rotate-180" : ""}`} width="16" height="16" viewBox="0 0 24 24" fill="#6b7280">
              <path d="M7 10l5 5 5-5z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mx-5 mb-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Delete "{pool.pool_name}"?</p>
          <p className="text-xs text-red-500 dark:text-red-400 mb-3">This cannot be undone. All members and transactions will be removed.</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 py-2 rounded-xl font-bold text-sm bg-red-500 text-white disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 py-2 rounded-xl font-bold text-sm bg-[#f3f4f6] dark:bg-gray-700 text-[#374151] dark:text-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {expanded && (
        <div className="border-t border-[#e5e9f0] dark:border-gray-700">
          {/* Join code bar */}
          <div className="px-5 py-3 bg-[#f9fafb] dark:bg-gray-750 flex items-center justify-between">
            <div>
              <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-0.5">Join Code</p>
              <p className="font-mono font-bold text-[#111827] dark:text-white tracking-widest">{pool.join_code}</p>
            </div>
            <button onClick={copyCode} className="text-xs text-[#1a2fb8] dark:text-blue-400 font-bold">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[#e5e9f0] dark:border-gray-700">
            {(["overview", "members", "loans", "transactions"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3 text-xs font-bold capitalize transition-colors ${
                  tab === t
                    ? "text-[#1a2fb8] dark:text-blue-400 border-b-2 border-[#1a2fb8] dark:border-blue-400"
                    : "text-[#6b7280] dark:text-gray-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-6">
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              </div>
            ) : (
              <>
                {/* ── Overview ── */}
                {tab === "overview" && analytics && (
                  <div className="flex flex-col gap-4">

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Total Deposited", value: fmtAmt(pool.total_liquidity) },
                        { label: "Total Borrowed", value: fmtAmt(pool.total_borrowed) },
                        { label: "Available", value: fmtAmt(pool.total_liquidity - pool.total_borrowed) },
                        { label: "Repayment Rate", value: (analytics.repaymentRate * 100).toFixed(0) + "%" },
                        { label: "Active Loans", value: analytics.activeLoans.toString() },
                        { label: "Members", value: analytics.memberCount.toString() },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#f9fafb] dark:bg-gray-700 rounded-2xl p-3">
                          <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-1">{s.label}</p>
                          <p className="font-bold text-[#111827] dark:text-white text-sm">{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* ── Multi-currency Deposit ── */}
                    <div className="bg-[#f9fafb] dark:bg-gray-700 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-[#6b7280] dark:text-gray-400 uppercase tracking-widest">Deposit</p>
                        <button
                          onClick={() => setDepositAmount(formatCryptoAmount(maxDepositCrypto, selectedCrypto))}
                          className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400"
                        >
                          Max: {formatCryptoAmount(maxDepositCrypto, selectedCrypto)} {selectedCrypto}
                        </button>
                      </div>

                      {/* Currency selector + risk badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="relative">
                          <select
                            value={selectedCrypto}
                            onChange={(e) => { setSelectedCrypto(e.target.value as CryptoSymbol); setDepositAmount(""); }}
                            className="appearance-none bg-white dark:bg-gray-600 border border-[#e5e9f0] dark:border-gray-500 rounded-xl px-3 py-2 pr-8 text-sm font-bold text-[#374151] dark:text-white cursor-pointer"
                          >
                            {Object.keys(CRYPTO_CONFIGS).map((sym) => (
                              <option key={sym} value={sym}>{sym}</option>
                            ))}
                          </select>
                          <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="#6b7280">
                            <path d="M7 10l5 5 5-5z" />
                          </svg>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${RISK_COLORS[CRYPTO_CONFIGS[selectedCrypto].riskCategory]}`}>
                          {RISK_LABELS[CRYPTO_CONFIGS[selectedCrypto].riskCategory]}
                        </span>
                      </div>

                      {/* Amount input */}
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder={`Amount in ${selectedCrypto}`}
                            step={getStepForCrypto(selectedCrypto)}
                            className="w-full rounded-xl px-3 py-2.5 text-sm border border-[#e5e9f0] dark:border-gray-500 bg-white dark:bg-gray-600 text-[#111827] dark:text-white outline-none focus:border-[#1a2fb8]"
                          />
                          {depositAmount && parseFloat(depositAmount) > 0 && (
                            <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-1 px-1">≈ {formatINR(depositINR)}</p>
                          )}
                        </div>
                        <button
                          onClick={handleDeposit}
                          disabled={actionLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                          className="px-4 py-2.5 rounded-xl font-bold text-sm bg-[#4ade80] text-[#14532d] disabled:opacity-50 self-start"
                        >
                          Deposit
                        </button>
                      </div>
                    </div>

                    {/* ── Borrow ── */}
                    {!activeLoan ? (
                      <div className="bg-[#f9fafb] dark:bg-gray-700 rounded-2xl p-4">
                        <p className="text-xs font-bold text-[#6b7280] dark:text-gray-400 uppercase tracking-widest mb-1">Borrow</p>
                        <p className="text-[10px] text-[#9ca3af] mb-3">10% credit weight · anti-abuse active</p>

                        {/* Amount row with currency selector */}
                        <div className="flex gap-2 mb-2">
                          {/* Currency selector for borrow */}
                          <div className="relative">
                            <select
                              value={borrowCurrency}
                              onChange={(e) => { setBorrowCurrency(e.target.value as BorrowCurrency); setBorrowAmount(""); }}
                              className="appearance-none bg-white dark:bg-gray-600 border border-[#e5e9f0] dark:border-gray-500 rounded-xl px-3 py-2.5 pr-7 text-sm font-bold text-[#374151] dark:text-white cursor-pointer"
                            >
                              <option value="ETH">ETH</option>
                              <option value="INR">₹ INR</option>
                              <option value="USD">$ USD</option>
                            </select>
                            <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="#6b7280"><path d="M7 10l5 5 5-5z" /></svg>
                          </div>

                          <div className="flex-1">
                            <input
                              type="number"
                              value={borrowAmount}
                              onChange={(e) => setBorrowAmount(e.target.value)}
                              placeholder={borrowCurrency === "ETH" ? "Amount in ETH" : borrowCurrency === "INR" ? "Amount in ₹" : "Amount in $"}
                              step={borrowCurrency === "ETH" ? "0.001" : "1"}
                              className="w-full rounded-xl px-3 py-2.5 text-sm border border-[#e5e9f0] dark:border-gray-500 bg-white dark:bg-gray-600 text-[#111827] dark:text-white outline-none"
                            />
                            {/* Show ETH equivalent when using INR/USD */}
                            {borrowAmount && parseFloat(borrowAmount) > 0 && borrowCurrency !== "ETH" && (
                              <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-1 px-1">
                                ≈ {borrowAmountETH.toFixed(6)} ETH
                              </p>
                            )}
                          </div>

                          {/* Days field with label */}
                          <div className="flex items-center gap-1.5 bg-white dark:bg-gray-600 border border-[#e5e9f0] dark:border-gray-500 rounded-xl px-3 py-2.5">
                            <span className="text-xs text-[#9ca3af] font-semibold whitespace-nowrap">Days</span>
                            <input
                              type="number"
                              value={borrowDays}
                              onChange={(e) => setBorrowDays(e.target.value)}
                              min="1"
                              className="w-12 text-sm text-center bg-transparent text-[#111827] dark:text-white outline-none font-bold"
                            />
                          </div>

                          <button
                            onClick={handleBorrow}
                            disabled={actionLoading}
                            className="px-4 py-2.5 rounded-xl font-bold text-sm bg-[#1a2fb8] text-white disabled:opacity-50 whitespace-nowrap"
                          >
                            Borrow
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#fef3c7] dark:bg-yellow-950 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-[#d97706] uppercase tracking-widest">Active Loan — Repay</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#d97706] border border-[#fde68a]">
                            Due {new Date(activeLoan.due_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xl font-black text-[#111827] dark:text-white mb-1">{fmtAmt(activeLoan.amount)}</p>
                        <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-3">{activeLoan.amount.toFixed(6)} ETH principal</p>

                        {/* Repay amount input with currency selector */}
                        <div className="flex gap-2 mb-2">
                          <div className="relative">
                            <select
                              value={repayUnit}
                              onChange={(e) => { setRepayUnit(e.target.value as "INR" | "USD" | "ETH"); setRepayInput(""); }}
                              className="appearance-none bg-white dark:bg-gray-600 border border-[#fde68a] rounded-xl px-2 py-2 pr-6 text-xs font-bold text-[#374151] dark:text-white cursor-pointer"
                            >
                              <option value="INR">₹ INR</option>
                              <option value="USD">$ USD</option>
                              <option value="ETH">ETH</option>
                            </select>
                            <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="#6b7280"><path d="M7 10l5 5 5-5z" /></svg>
                          </div>
                          <input
                            type="number"
                            value={repayInput}
                            onChange={(e) => setRepayInput(e.target.value)}
                            placeholder={repayUnit === "INR" ? "Amount ₹" : repayUnit === "USD" ? "Amount $" : "Amount ETH"}
                            step={repayUnit === "ETH" ? "0.000001" : "1"}
                            className="flex-1 rounded-xl px-3 py-2 text-sm border border-[#fde68a] bg-white dark:bg-gray-600 text-[#111827] dark:text-white outline-none"
                          />
                          <button
                            onClick={() => {
                              const total = activeLoan.amount;
                              if (repayUnit === "INR") setRepayInput(ethToINR(total, ethPrice).toFixed(0));
                              else if (repayUnit === "USD") setRepayInput((ethToINR(total, ethPrice) / 83).toFixed(2));
                              else setRepayInput(total.toFixed(6));
                            }}
                            className="px-2 py-2 rounded-xl text-xs font-bold bg-[#fef3c7] text-[#d97706] border border-[#fde68a]"
                          >
                            Full
                          </button>
                        </div>
                        {repayInput && repayAmountETH > 0 && repayUnit !== "ETH" && (
                          <p className="text-[10px] text-[#9ca3af] mb-2 px-1">≈ {repayAmountETH.toFixed(6)} ETH</p>
                        )}
                        {repayInput && repayAmountETH > 0 && repayUnit === "ETH" && (
                          <p className="text-[10px] text-[#9ca3af] mb-2 px-1">≈ {fmtAmt(repayAmountETH)}</p>
                        )}

                        <button
                          onClick={() => handleRepay(activeLoan.id)}
                          disabled={actionLoading || !repayInput || repayAmountETH <= 0}
                          className="w-full py-2.5 rounded-xl font-bold text-sm bg-[#1a2fb8] text-white disabled:opacity-50 transition-all active:scale-95"
                        >
                          {actionLoading ? "Processing..." : "Repay " + (repayInput && repayAmountETH > 0 ? fmtAmt(repayAmountETH) : fmtAmt(activeLoan.amount))}
                        </button>
                      </div>
                    )}

                    {actionMsg && <p className="text-sm text-green-600 font-medium">{actionMsg}</p>}
                    {actionError && <p className="text-sm text-red-500">{actionError}</p>}
                  </div>
                )}

                {/* ── Members ── */}
                {tab === "members" && (
                  <div className="flex flex-col gap-2">
                    {/* Pool money summary */}
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 bg-[#f0fdf4] dark:bg-green-950 rounded-xl p-3">
                        <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Pool Total</p>
                        <p className="text-sm font-black text-green-700 dark:text-green-400">{fmtAmt(pool.total_liquidity)}</p>
                      </div>
                      <div className="flex-1 bg-[#eef2ff] dark:bg-blue-950 rounded-xl p-3">
                        <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Lent Out</p>
                        <p className="text-sm font-black text-[#1a2fb8] dark:text-blue-400">{fmtAmt(pool.total_borrowed)}</p>
                      </div>
                      <div className="flex-1 bg-[#f9fafb] dark:bg-gray-700 rounded-xl p-3">
                        <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Available</p>
                        <p className="text-sm font-black text-[#111827] dark:text-white">{fmtAmt(pool.total_liquidity - pool.total_borrowed)}</p>
                      </div>
                    </div>
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-[#111827] dark:text-white">
                            {(m.profiles as { name: string })?.name ?? "Member"}
                            {m.role === "creator" && <span className="ml-2 text-[10px] text-[#1a2fb8] dark:text-blue-400 font-bold">CREATOR</span>}
                          </p>
                          <p className="text-xs text-[#6b7280] dark:text-gray-400">
                            {m.status === "pending" ? "⏳ Pending" : m.status === "active" ? "✅ Active" : "❌ Rejected"}
                          </p>
                        </div>
                        {isCreator && m.status === "pending" && (
                          <div className="flex gap-2">
                            <button onClick={() => handleApprove(m.user_id, true)} className="px-3 py-1 rounded-lg text-xs font-bold bg-[#4ade80] text-[#14532d]">Approve</button>
                            <button onClick={() => handleApprove(m.user_id, false)} className="px-3 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-600">Reject</button>
                          </div>
                        )}
                      </div>
                    ))}
                    {members.length === 0 && <p className="text-sm text-[#9ca3af]">No members yet</p>}
                  </div>
                )}

                {/* ── Loans ── */}
                {tab === "loans" && (
                  <div className="flex flex-col gap-2">
                    {/* Loan summary bar */}
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1 bg-[#eef2ff] dark:bg-blue-950 rounded-xl p-3">
                        <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Total Lent</p>
                        <p className="text-sm font-black text-[#1a2fb8] dark:text-blue-400">{fmtAmt(analytics?.totalBorrowed ?? 0)}</p>
                      </div>
                      <div className="flex-1 bg-[#fef3c7] dark:bg-yellow-950 rounded-xl p-3">
                        <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Active</p>
                        <p className="text-sm font-black text-[#d97706]">{analytics?.activeLoans ?? 0} loans</p>
                      </div>
                      <div className="flex-1 bg-[#f0fdf4] dark:bg-green-950 rounded-xl p-3">
                        <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Repaid</p>
                        <p className="text-sm font-black text-green-700 dark:text-green-400">{((analytics?.repaymentRate ?? 0) * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    {loans.map((l) => (
                      <div key={l.id} className="flex items-center justify-between py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[#111827] dark:text-white">{fmtAmt(l.amount)}</p>
                            {l.borrower_name && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eef2ff] text-[#1a2fb8] dark:bg-blue-950 dark:text-blue-400">
                                {l.borrower_name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#6b7280] dark:text-gray-400">{l.amount.toFixed(4)} ETH · {l.duration_days}d · Due {new Date(l.due_date).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          l.status === "active" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" :
                          l.status === "repaid" ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" :
                          "bg-red-100 text-red-600"
                        }`}>{l.status.toUpperCase()}</span>
                      </div>
                    ))}
                    {loans.length === 0 && <p className="text-sm text-[#9ca3af]">No loans yet</p>}
                  </div>
                )}

                {/* ── Transactions ── */}
                {tab === "transactions" && (
                  <div className="flex flex-col gap-2">
                    {/* Transaction volume summary */}
                    {transactions.length > 0 && (
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1 bg-[#f0fdf4] dark:bg-green-950 rounded-xl p-3">
                          <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Total In</p>
                          <p className="text-sm font-black text-green-700 dark:text-green-400">
                            {fmtAmt(transactions.filter(t => t.type === "deposit" || t.type === "repay").reduce((s, t) => s + t.amount, 0))}
                          </p>
                        </div>
                        <div className="flex-1 bg-[#eef2ff] dark:bg-blue-950 rounded-xl p-3">
                          <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Total Out</p>
                          <p className="text-sm font-black text-[#1a2fb8] dark:text-blue-400">
                            {fmtAmt(transactions.filter(t => t.type === "borrow" || t.type === "withdraw").reduce((s, t) => s + t.amount, 0))}
                          </p>
                        </div>
                        <div className="flex-1 bg-[#f9fafb] dark:bg-gray-700 rounded-xl p-3">
                          <p className="text-[10px] text-[#6b7280] dark:text-gray-400 mb-0.5">Count</p>
                          <p className="text-sm font-black text-[#111827] dark:text-white">{transactions.length}</p>
                        </div>
                      </div>
                    )}
                    {transactions.slice(0, 20).map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-[#111827] dark:text-white capitalize">{t.type}</p>
                          <p className="text-xs text-[#6b7280] dark:text-gray-400">{new Date(t.created_at).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${t.type === "deposit" || t.type === "repay" ? "text-green-600" : "text-[#1a2fb8] dark:text-blue-400"}`}>
                            {t.type === "borrow" ? "+" : "-"}{fmtAmt(t.amount)}
                          </p>
                          <p className="text-[10px] text-[#9ca3af]">{t.amount.toFixed(4)} ETH</p>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="text-sm text-[#9ca3af]">No transactions yet</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
