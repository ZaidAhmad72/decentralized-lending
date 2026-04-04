"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoanCard from "@/components/LoanCard";
import Navbar from "@/components/Navbar";

const mockLoans = [
  {
    id: 1,
    borrower: "Marcus Reid",
    amount: 5000,
    reason: "Expanding my small bakery business — need equipment for a second location.",
    duration: "30 Days",
    score: 920,
  },
  {
    id: 2,
    borrower: "Priya Sharma",
    amount: 2500,
    reason: "Medical expenses for a family member. Will repay from next month's salary.",
    duration: "14 Days",
    score: 875,
  },
  {
    id: 3,
    borrower: "James Okafor",
    amount: 8000,
    reason: "Inventory purchase for my e-commerce store ahead of the holiday season.",
    duration: "60 Days",
    score: 950,
  },
  {
    id: 4,
    borrower: "Sofia Mendes",
    amount: 1200,
    reason: "Tuition payment for online certification course in data science.",
    duration: "30 Days",
    score: 840,
  },
  {
    id: 5,
    borrower: "Liam Chen",
    amount: 15000,
    reason: "Bridge loan for real estate down payment while awaiting property sale.",
    duration: "90 Days",
    score: 990,
  },
];

export default function LoansPage() {
  const router = useRouter();
  const [funded, setFunded] = useState<number[]>([]);

  const handleFund = (id: number) => {
    setFunded((prev) => [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] pb-24">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
        <div className="bg-[#1a2fb8] text-white text-xs font-bold px-3 py-1.5 rounded-full tracking-wide">
          980 SCORE
        </div>
      </div>

      <div className="px-5">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-[#111827] mb-1">Marketplace</h1>
          <p className="text-[#6b7280] text-sm">Fund verified borrowers and earn yield.</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Active Loans", value: "142" },
            { label: "Avg. APY", value: "8.7%" },
            { label: "Total Funded", value: "$2.1M" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-[#e5e9f0]">
              <p className="text-lg font-black text-[#111827]">{stat.value}</p>
              <p className="text-[10px] text-[#6b7280] font-semibold mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Loan List */}
        <div className="flex flex-col gap-4">
          {mockLoans.map((loan) => (
            <div key={loan.id} className="relative">
              {funded.includes(loan.id) ? (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#4ade80] flex items-center justify-center gap-3">
                  <div className="w-8 h-8 bg-[#4ade80] rounded-full flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#14532d">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                  <span className="font-bold text-[#15803d]">Funded successfully</span>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-xs text-[#6b7280] font-semibold">Score: {loan.score}</span>
                    <span className="text-xs bg-[#eef2ff] text-[#1a2fb8] font-bold px-2 py-0.5 rounded-full">
                      {loan.duration}
                    </span>
                  </div>
                  <LoanCard
                    borrower={loan.borrower}
                    amount={loan.amount}
                    reason={loan.reason}
                    duration={loan.duration}
                    onFund={() => handleFund(loan.id)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
