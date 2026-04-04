"use client";

import { useState } from "react";
import LoanCard from "@/components/LoanCard";
import Navbar from "@/components/Navbar";
import { useWallet } from "@/wallet/walletHooks";
import { fundLoan } from "@/services/transactionService";
import { createClient } from "@/utils/supabase/client";

const mockLoans = [
  { id: 1, borrower: "Marcus Reid", amount: 5000, reason: "Expanding my small bakery business — need equipment for a second location.", duration: "30 Days", score: 920, walletAddress: "0xaBcD1234aBcD1234aBcD1234aBcD1234aBcD1234" },
  { id: 2, borrower: "Priya Sharma", amount: 2500, reason: "Medical expenses for a family member. Will repay from next month's salary.", duration: "14 Days", score: 875, walletAddress: "0x1111222233334444555566667777888899990000" },
  { id: 3, borrower: "James Okafor", amount: 8000, reason: "Inventory purchase for my e-commerce store ahead of the holiday season.", duration: "60 Days", score: 950, walletAddress: "0xDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEfDeAdBeEf" },
  { id: 4, borrower: "Sofia Mendes", amount: 1200, reason: "Tuition payment for online certification course in data science.", duration: "30 Days", score: 840, walletAddress: "0xFaCeFaCeFaCeFaCeFaCeFaCeFaCeFaCeFaCeFaCe" },
  { id: 5, borrower: "Liam Chen", amount: 15000, reason: "Bridge loan for real estate down payment while awaiting property sale.", duration: "90 Days", score: 990, walletAddress: "0xCaFeBaBeCaFeBaBeCaFeBaBeCaFeBaBeCaFeBaBe" },
  { id: 6, borrower: "Aisha Patel", amount: 3500, reason: "Working capital for freelance design studio during slow season.", duration: "30 Days", score: 905, walletAddress: "0x0000111122223333444455556666777788889999" },
];

type FundedLoan = { id: number; rate: string };

export default function LoansPage() {
  const [funded, setFunded] = useState<FundedLoan[]>([]);
  const { address: lenderAddress } = useWallet();
  const supabase = createClient();

  const handleConfirmFund = (id: number, rate: string) => {
    setFunded((prev) => [...prev, { id, rate }]);
  };

  const handleFundViaWallet = async (loan: typeof mockLoans[0], rate: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (!lenderAddress) throw new Error("Wallet not ready");

    await fundLoan(user.id, loan.id, loan.walletAddress);
    setFunded((prev) => [...prev, { id: loan.id, rate }]);
  };

  const isFunded = (id: number) => funded.some((f) => f.id === id);
  const getFundedRate = (id: number) => funded.find((f) => f.id === id)?.rate;

  return (
    <div className="min-h-screen bg-[#eef2f7] pb-24 lg:pb-10 lg:pt-20">

      {/* ── Mobile-only top bar ── */}
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div>
          <h1 className="text-2xl font-black text-[#111827]">Marketplace</h1>
          <p className="text-[#6b7280] text-sm">Fund verified borrowers and earn yield.</p>
        </div>
        <div className="bg-[#1a2fb8] text-white text-xs font-bold px-3 py-1.5 rounded-full">980 SCORE</div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">

        {/* Desktop heading */}
        <div className="hidden lg:block mb-8">
          <h1 className="text-4xl font-black text-[#111827] mb-1">Marketplace</h1>
          <p className="text-[#6b7280] text-base">Fund verified borrowers and earn yield on your capital.</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Active Loans", value: "142" },
            { label: "Avg. APY", value: "8.7%" },
            { label: "Total Funded", value: "$2.1M" },
            { label: "Avg. Score", value: "912" },
            { label: "Repay Rate", value: "98.4%" },
            { label: "Avg. Duration", value: "32d" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-[#e5e9f0]">
              <p className="text-lg font-black text-[#111827]">{stat.value}</p>
              <p className="text-[10px] text-[#6b7280] font-semibold mt-0.5 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Loan grid — 1 col mobile, 2 col md, 3 col lg */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {mockLoans.map((loan) =>
            isFunded(loan.id) ? (
              <div
                key={loan.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-[#4ade80] flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-[#4ade80] rounded-full flex items-center justify-center flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#14532d">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-[#15803d] text-sm">Funded — {loan.borrower}</p>
                  <p className="text-xs text-[#6b7280]">Your rate: {getFundedRate(loan.id)}%</p>
                </div>
              </div>
            ) : (
              <LoanCard
                key={loan.id}
                borrower={loan.borrower}
                amount={loan.amount}
                reason={loan.reason}
                duration={loan.duration}
                score={loan.score}
                walletAddress={loan.walletAddress}
                onConfirmFund={(rate) => handleConfirmFund(loan.id, rate)}
                onFundViaWallet={lenderAddress ? (rate) => handleFundViaWallet(loan, rate) : undefined}
              />
            )
          )}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
