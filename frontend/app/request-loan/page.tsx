"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function RequestLoanPage() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("30 Days");
  const [purpose, setPurpose] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const dailyRate = "0.024%";

  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => router.push("/loans"), 1500);
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
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] mb-2">Request capital.</h1>
          <p className="text-[#6b7280] text-sm lg:text-base leading-relaxed">
            Access liquidity instantly based on your verified Vault reputation score.
          </p>
        </div>

        {/* ── Desktop: two-column layout ── */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* Left: form */}
          <div className="w-full lg:max-w-lg xl:max-w-xl flex flex-col gap-5">

            {/* Standing Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5e9f0]">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">Current Standing</p>
              <p className="text-3xl font-black text-[#15803d] mb-1">High</p>
              <p className="text-sm text-[#6b7280] mb-4">98th Percentile Borrower</p>
              <div className="w-full bg-[#e5e9f0] rounded-full h-2 mb-2">
                <div className="bg-[#15803d] h-2 rounded-full" style={{ width: "98%" }} />
              </div>
              <div className="flex justify-between text-xs text-[#6b7280] font-semibold">
                <span>RELIABILITY</span>
                <span className="text-[#15803d]">EXCELLENT</span>
              </div>
            </div>

            {/* Form inputs */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0] flex flex-col gap-5">

              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                  Loan Amount (USDC)
                </label>
                <div className="flex items-center bg-[#f9fafb] rounded-2xl px-4 py-4 border border-[#e5e9f0] gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 outline-none text-xl font-bold text-[#374151] placeholder-[#d1d5db] bg-transparent"
                  />
                  <div className="w-8 h-8 bg-[#eef2ff] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8">
                      <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                  Repayment Term
                </label>
                <div className="flex items-center bg-[#f9fafb] rounded-2xl px-4 py-4 border border-[#e5e9f0]">
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="flex-1 outline-none text-base font-semibold text-[#374151] bg-transparent appearance-none cursor-pointer"
                  >
                    <option>7 Days</option>
                    <option>14 Days</option>
                    <option>30 Days</option>
                    <option>60 Days</option>
                    <option>90 Days</option>
                  </select>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280">
                    <path d="M7 10l5 5 5-5z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                  Daily Rate
                </label>
                <div className="flex items-center bg-[#f9fafb] rounded-2xl px-4 py-4 border border-[#e5e9f0]">
                  <span className="flex-1 text-base font-bold text-[#16a34a]">{dailyRate}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#16a34a">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
                  </svg>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
                  Purpose of Loan
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Briefly describe how you'll use the funds"
                  rows={4}
                  className="w-full bg-[#f9fafb] rounded-2xl px-4 py-4 border border-[#e5e9f0] outline-none text-sm text-[#374151] placeholder-[#9ca3af] resize-none focus:border-[#1a2fb8] transition-colors"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitted}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-70"
            >
              {submitted ? "Submitting..." : "Submit Request"}
              {!submitted && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                </svg>
              )}
            </button>
          </div>

          {/* Right: info panel */}
          <div className="w-full lg:flex-1 flex flex-col gap-5">
            {/* Eligibility Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0] flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-[#4ade80] rounded-2xl flex items-center justify-center mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#14532d">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-black text-[#111827] mb-2">Reputation Eligibility Confirmed</h3>
              <p className="text-sm text-[#6b7280] leading-relaxed mb-4">
                Based on your historical repayment data and liquidity health, you are eligible for up to{" "}
                <span className="font-bold text-[#111827]">$25,000</span> in uncollateralized credit. Approvals are
                typically processed within 4 minutes.
              </p>
              <button className="text-sm font-bold text-[#1a2fb8] tracking-wide">VIEW GUIDELINES</button>
            </div>

            {/* Desktop: loan terms summary */}
            <div className="hidden lg:block bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0]">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-4">Loan Summary</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Requested Amount", value: amount ? `$${parseFloat(amount).toLocaleString()}` : "—" },
                  { label: "Repayment Term", value: duration },
                  { label: "Daily Rate", value: dailyRate },
                  { label: "Est. Total Interest", value: amount ? `$${(parseFloat(amount) * 0.00024 * parseInt(duration)).toFixed(2)}` : "—" },
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
