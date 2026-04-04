"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const loan = {
  id: "#88291",
  principal: 12450.0,
  interest: 89.64,
  dueDate: "Apr 18, 2026",
  daysLeft: 14,
  duration: "30 Days",
  dailyRate: "0.024%",
};

export default function RepayPage() {
  const router = useRouter();
  const [repaid, setRepaid] = useState(false);
  const [partial, setPartial] = useState("");

  const totalDue = loan.principal + loan.interest;

  const handleRepay = () => {
    setRepaid(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] pb-24 lg:pb-10 lg:pt-20">

      {/* ── Mobile-only top bar ── */}
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </button>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
        <div className="bg-[#1a2fb8] text-white text-xs font-bold px-3 py-1.5 rounded-full">980 SCORE</div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">

        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] mb-2">Repay Loan</h1>
          <p className="text-[#6b7280] text-sm lg:text-base">Settle your active loan and boost your reputation score.</p>
        </div>

        {/* ── Desktop: two-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Left: repay form */}
          <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

            {/* Loan Summary */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0]">
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">Loan {loan.id}</span>
                <span className="bg-[#fef3c7] text-[#d97706] text-xs font-bold px-3 py-1 rounded-full">
                  {loan.daysLeft} Days Left
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { label: "Principal", value: `$${loan.principal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-[#111827]" },
                  { label: "Accrued Interest", value: `+$${loan.interest.toFixed(2)}`, color: "text-[#d97706]" },
                  { label: "Daily Rate", value: loan.dailyRate, color: "text-[#374151]" },
                  { label: "Due Date", value: loan.dueDate, color: "text-[#374151]" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-3 border-b border-[#f3f4f6]">
                    <span className="text-sm text-[#6b7280]">{row.label}</span>
                    <span className={`font-bold text-sm ${row.color}`}>{row.value}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3">
                  <span className="text-base font-bold text-[#111827]">Total Due</span>
                  <span className="text-2xl font-black text-[#111827]">
                    ${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Partial Repayment */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0]">
              <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-3">
                Partial Repayment (Optional)
              </label>
              <div className="flex items-center bg-[#f9fafb] rounded-2xl px-4 py-4 border border-[#e5e9f0] gap-3">
                <span className="text-[#374151] font-bold text-base">$</span>
                <div className="w-px h-5 bg-[#d1d5db]" />
                <input
                  type="number"
                  value={partial}
                  onChange={(e) => setPartial(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
                />
              </div>
              <p className="text-xs text-[#6b7280] mt-2">
                Partial payments reduce your principal and daily interest.
              </p>
            </div>

            {/* Repay Button */}
            {repaid ? (
              <div className="w-full bg-[#4ade80] text-[#14532d] rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#14532d">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Repayment Successful
              </div>
            ) : (
              <button
                onClick={handleRepay}
                className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
                Repay ${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </button>
            )}
          </div>

          {/* Right: info panel */}
          <div className="w-full lg:flex-1 flex flex-col gap-5">

            {/* Reputation Boost */}
            <div className="bg-[#f0fdf4] rounded-3xl p-6 border border-[#bbf7d0] flex items-start gap-4">
              <div className="w-10 h-10 bg-[#4ade80] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#14532d">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#15803d] mb-1">Reputation Boost on Repayment</p>
                <p className="text-xs text-[#16a34a] leading-relaxed">
                  Early repayment earns you +25 reputation points and improves your borrowing limit for future loans.
                </p>
              </div>
            </div>

            {/* Desktop: repayment breakdown */}
            <div className="hidden lg:block bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0]">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-4">Repayment Breakdown</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "You're paying", value: `$${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                  { label: "Principal cleared", value: `$${loan.principal.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                  { label: "Interest paid", value: `$${loan.interest.toFixed(2)}` },
                  { label: "Reputation gain", value: "+25 PTS" },
                  { label: "New borrow limit", value: "$30,000" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#f3f4f6] last:border-0">
                    <span className="text-sm text-[#6b7280]">{row.label}</span>
                    <span className="text-sm font-bold text-[#111827]">{row.value}</span>
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
