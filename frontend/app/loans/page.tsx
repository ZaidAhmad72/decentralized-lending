"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import LoanCard from "@/components/LoanCard";
import { createClient } from "@/utils/supabase/client";
import { fetchPendingLoans, fundLoan, type LoanRequest } from "@/lib/loans";
import { useWallet } from "@/wallet/walletHooks";
import { fundLoan as fundLoanViaWallet } from "@/services/transactionService";

export default function LoansPage() {
  const supabase = createClient();
  const { address: lenderAddress } = useWallet();
  
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [fundedIds, setFundedIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);
      try {
        const data = await fetchPendingLoans(user.id);
        setLoans(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load loans.");
      }
      setLoading(false);
    };
    load();
  }, []);

  // Standard fund (database only)
  const handleFund = async (loanId: string, rate: string) => {
    try {
      await fundLoan(loanId, currentUserId, parseFloat(rate));
      setFundedIds((prev) => [...prev, loanId]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fund loan.");
    }
  };

  // Fund via wallet (blockchain + database)
  const handleFundViaWallet = async (loan: LoanRequest, rate: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (!lenderAddress) throw new Error("Wallet not ready");

    // Get borrower wallet address from profiles
    const { data: borrowerProfile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", loan.borrower_id)
      .single();

    if (!borrowerProfile?.wallet_address) {
      throw new Error("Borrower wallet address not found");
    }

    // Execute blockchain transaction
    await fundLoanViaWallet(user.id, loan.id, borrowerProfile.wallet_address);
    
    // Update database
    await fundLoan(loan.id, currentUserId, parseFloat(rate));
    setFundedIds((prev) => [...prev, loan.id]);
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20 transition-colors">
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827] dark:text-white">Marketplace</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm">Fund verified borrowers and earn yield.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="hidden lg:block mb-8">
          <h1 className="text-4xl font-black text-[#111827] dark:text-white mb-1">Marketplace</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-base">Fund verified borrowers and earn yield on your capital.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-2xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-[#6b7280] dark:text-gray-400">Loading loans...</div>
        ) : loans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#111827] dark:text-white font-bold text-lg mb-2">No pending loans</p>
            <p className="text-[#6b7280] dark:text-gray-400 text-sm">Check back soon or request a loan yourself.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loans.map((loan) =>
              fundedIds.includes(loan.id) ? (
                <div key={loan.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-[#4ade80] flex items-center gap-3 transition-colors">
                  <div className="w-9 h-9 bg-[#4ade80] rounded-full flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#14532d"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  </div>
                  <div>
                    <p className="font-bold text-[#15803d] dark:text-green-400 text-sm">Funded — {loan.profiles?.name ?? "Borrower"}</p>
                    <p className="text-xs text-[#6b7280] dark:text-gray-400">${loan.amount.toLocaleString()} · {loan.duration_days} days</p>
                  </div>
                </div>
              ) : (
                <LoanCard
                  key={loan.id}
                  loanId={loan.id}
                  borrower={loan.profiles?.name ?? "Anonymous"}
                  amount={loan.amount}
                  reason={loan.purpose}
                  duration={`${loan.duration_days} Days`}
                  score={loan.profiles?.reputation_score ?? 0}
                  walletAddress={loan.profiles?.wallet_address}
                  onConfirmFund={(rate) => handleFund(loan.id, rate)}
                  onFundViaWallet={lenderAddress ? (rate) => handleFundViaWallet(loan, rate) : undefined}
                />
              )
            )}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}
