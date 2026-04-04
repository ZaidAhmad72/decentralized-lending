"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import WalletCard from "@/components/WalletCard";
import { createClient } from "@/utils/supabase/client";

const defaultUser = {
  name: "Alexander Vance",
  score: 980,
  activeLoan: 12450.0,
  loanDueDays: 14,
  walletBalance: 48291.5,
  apy: 2.4,
};

const activity = [
  { icon: "📈", title: "Interest Accrued", sub: "Loan #88291", value: "+$124.50", positive: true },
  { icon: "🛡️", title: "Reputation Minted", sub: "Monthly streak bonus", value: "+15 PTS", positive: true },
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayPhone, setDisplayPhone] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", data.user.id)
        .single();
      setDisplayPhone(profile?.name || data.user.email || "");
    });
  }, []);

  const user = { ...defaultUser, name: displayPhone || defaultUser.name };

  return (
    <div className="min-h-screen bg-[#eef2f7] pb-24 lg:pb-10 lg:pt-20">

      {/* ── Mobile-only top bar ── */}
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#374151] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
        <div className="bg-[#1a2fb8] text-white text-xs font-bold px-3 py-1.5 rounded-full">
          {user.score} SCORE
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="max-w-7xl mx-auto px-5 lg:px-10">

        {/* Welcome */}
        <div className="mb-6">
          <p className="text-[#6b7280] text-sm">Welcome back,</p>
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827]">{user.name}</h1>
        </div>

        {/* ── Desktop: 3-col stat cards + action buttons side by side ── */}
        <div className="flex flex-col lg:flex-row gap-6 mb-6">

          {/* Left column: stat cards */}
          <div className="flex flex-col gap-4 lg:flex-1">

            {/* Score + Loan + Wallet — stacked mobile, row on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Score Card */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5e9f0]">
                <div className="flex flex-col items-center mb-3">
                  <div className="relative w-36 h-20 overflow-hidden mb-2">
                    <svg viewBox="0 0 144 80" className="w-full h-full">
                      <path d="M 12 72 A 60 60 0 0 1 132 72" fill="none" stroke="#e5e9f0" strokeWidth="10" strokeLinecap="round" />
                      <path d="M 12 72 A 60 60 0 0 1 132 72" fill="none" stroke="#15803d" strokeWidth="10" strokeLinecap="round" strokeDasharray="188.5" strokeDashoffset="3.77" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                      <span className="text-3xl font-black text-[#111827]">{user.score}</span>
                    </div>
                  </div>
                  <span className="bg-[#4ade80] text-[#14532d] text-xs font-bold px-3 py-1 rounded-full">HIGH</span>
                </div>
                <p className="text-center text-sm text-[#6b7280]">
                  Top 2% of global lenders.
                </p>
              </div>

              {/* Active Loan */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5e9f0] flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#eef2ff] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8">
                      <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">Active Loan</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#111827]">
                    ${user.activeLoan.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-[#16a34a] font-semibold mt-1">Due in {user.loanDueDays} Days</p>
                </div>
              </div>

              {/* Wallet Balance */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5e9f0] flex flex-col justify-between">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#f0fdf4] rounded-lg flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a">
                      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">Wallet Balance</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-[#111827]">
                    ${user.walletBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-[#16a34a] font-semibold mt-1">+{user.apy}% APY</p>
                </div>
              </div>
            </div>

            {/* Market Activity */}
            <div>
              <h2 className="text-xl font-black text-[#111827] mb-3">Market Activity</h2>
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e5e9f0]">
                {activity.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 px-5 py-4 ${i < activity.length - 1 ? "border-b border-[#f3f4f6]" : ""}`}
                  >
                    <div className="w-10 h-10 bg-[#f3f4f6] rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#111827] text-sm">{item.title}</p>
                      <p className="text-xs text-[#6b7280]">{item.sub}</p>
                    </div>
                    <span className={`font-bold text-sm flex-shrink-0 ${item.positive ? "text-[#16a34a]" : "text-red-500"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column (desktop): action buttons */}
          <div className="flex flex-col gap-3 lg:w-72 lg:flex-shrink-0">
            <h2 className="text-xl font-black text-[#111827] hidden lg:block">Quick Actions</h2>

            <button
              onClick={() => router.push("/request-loan")}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-between px-5 hover:bg-[#1527a0] transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </div>
                Request Loan
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/loans")}
                className="bg-[#4ade80] text-[#14532d] rounded-2xl py-5 font-bold text-base flex flex-col items-center gap-2 hover:bg-[#22c55e] transition-all active:scale-95"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#14532d">
                  <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                </svg>
                Fund Loan
              </button>
              <button
                onClick={() => router.push("/repay")}
                className="bg-[#e5e9f0] text-[#374151] rounded-2xl py-5 font-bold text-base flex flex-col items-center gap-2 hover:bg-[#d1d5db] transition-all active:scale-95"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#374151">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </svg>
                Repay Loan
              </button>
            </div>

            {/* Smart Wallet Card */}
            <WalletCard />

            {/* Desktop: quick stats panel */}
            <div className="hidden lg:block bg-white rounded-3xl p-5 shadow-sm border border-[#e5e9f0] mt-1">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-4">Your Stats</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Loans Repaid", value: "12" },
                  { label: "On-time Rate", value: "100%" },
                  { label: "Total Borrowed", value: "$84,200" },
                  { label: "Reputation Rank", value: "Top 2%" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-sm text-[#6b7280]">{s.label}</span>
                    <span className="text-sm font-bold text-[#111827]">{s.value}</span>
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
