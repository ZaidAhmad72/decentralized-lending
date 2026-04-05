"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { getUserTransactions, type Transaction } from "@/services/poolService";
import { getEthPriceINR, formatINR, ethToINR } from "@/utils/getEthPrice";

const TYPE_CONFIG = {
  deposit:  { label: "Deposit",  color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",  icon: "↓", sign: "+" },
  borrow:   { label: "Borrow",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",     icon: "↗", sign: "+" },
  repay:    { label: "Repay",    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", icon: "↙", sign: "-" },
  withdraw: { label: "Withdraw", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", icon: "↑", sign: "-" },
};

export default function TransactionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [ethPrice, setEthPrice] = useState(0);
  const [filter, setFilter] = useState<"all" | "deposit" | "borrow" | "repay" | "withdraw">("all");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      try {
        const [txs, price] = await Promise.all([
          getUserTransactions(user.id),
          getEthPriceINR(),
        ]);
        setTransactions(txs);
        setEthPrice(price);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const filtered = filter === "all" ? transactions : transactions.filter(t => t.type === filter);

  const totals = {
    deposited: transactions.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0),
    borrowed:  transactions.filter(t => t.type === "borrow").reduce((s, t) => s + t.amount, 0),
    repaid:    transactions.filter(t => t.type === "repay").reduce((s, t) => s + t.amount, 0),
    withdrawn: transactions.filter(t => t.type === "withdraw").reduce((s, t) => s + t.amount, 0),
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0] dark:border-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#111827] dark:text-white mb-1">Transaction History</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm">All your deposits, borrows, repayments and withdrawals</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Deposited", amount: totals.deposited, color: "text-green-600" },
            { label: "Total Borrowed",  amount: totals.borrowed,  color: "text-blue-600" },
            { label: "Total Repaid",    amount: totals.repaid,    color: "text-purple-600" },
            { label: "Total Withdrawn", amount: totals.withdrawn, color: "text-orange-600" },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
              <p className="text-xs text-[#6b7280] dark:text-gray-400 mb-1">{card.label}</p>
              <p className={`text-sm font-black ${card.color}`}>{formatINR(ethToINR(card.amount, ethPrice))}</p>
              <p className="text-[10px] text-[#9ca3af] mt-0.5">{card.amount.toFixed(4)} ETH</p>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(["all", "deposit", "borrow", "repay", "withdraw"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filter === f
                  ? "bg-[#1a2fb8] text-white"
                  : "bg-white dark:bg-gray-800 text-[#6b7280] dark:text-gray-400 border border-[#e5e9f0] dark:border-gray-700"
              }`}
            >
              {f === "all" ? `All (${transactions.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${transactions.filter(t => t.type === f).length})`}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-[#e5e9f0] dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-[#6b7280] dark:text-gray-400 text-sm">Loading transactions...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-[#9ca3af] text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f3f4f6] dark:divide-gray-700">
              {filtered.map((tx) => {
                const cfg = TYPE_CONFIG[tx.type];
                const inrAmount = ethToINR(tx.amount, ethPrice);
                return (
                  <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#f9fafb] dark:hover:bg-gray-750 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${cfg.color}`}>
                        {cfg.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#111827] dark:text-white">{cfg.label}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{tx.type}</span>
                        </div>
                        <p className="text-xs text-[#9ca3af] mt-0.5">{formatDate(tx.created_at)}</p>
                        {tx.tx_hash && (
                          <p className="text-[10px] font-mono text-[#9ca3af] mt-0.5">{tx.tx_hash.slice(0, 20)}...</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${cfg.sign === "+" ? "text-green-600" : "text-red-500"}`}>
                        {cfg.sign}{formatINR(inrAmount)}
                      </p>
                      <p className="text-[10px] text-[#9ca3af]">{cfg.sign}{tx.amount.toFixed(6)} ETH</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Interest Note */}
        <div className="mt-4 bg-blue-50 dark:bg-blue-950 rounded-2xl p-4 border border-blue-100 dark:border-blue-900">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">How interest works</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
            When you repay a loan, the interest portion is added to the pool's total liquidity. 
            This increases the value of every depositor's shares automatically — no claiming needed.
            Your share value grows proportionally to your pool contribution.
          </p>
        </div>
      </div>
      <Navbar />
    </div>
  );
}
