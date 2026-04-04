"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/utils/supabase/client";
import { fetchActiveLoan, repayLoan, checkAndMarkDefaulted, type LoanRequest } from "@/lib/loans";

export default function RepayPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loan, setLoan] = useState<LoanRequest | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [repaying, setRepaying] = useState(false);
  const [repaid, setRepaid] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      setUserId(user.id);
      await checkAndMarkDefaulted(user.id);
      const activeLoan = await fetchActiveLoan(user.id);
      setLoan(activeLoan);
      setLoading(false);
    };
    load();
  }, []);

  const handleRepay = async () => {
    if (!loan) return;
    setRepaying(true);
    setError("");
    try {
      await repayLoan(loan.id, userId);
      setRepaid(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Repayment failed.");
    }
    setRepaying(false);
  };

  const daysLeft = loan?.due_date
    ? Math.max(0, Math.ceil((new Date(loan.due_date).getTime() - Date.now()) / 86400000))
    : 0;

  const interest = loan
    ? parseFloat((loan.amount * (0.024 / 100) * loan.duration_days).toFixed(2))
    : 0;

  const totalDue = loan ? loan.amount + interest : 0;

  if (loading) return (
    <div className="min-h-screen bg-[#eef2f7] flex items-center justify-center">
      <p className="text-[#6b7280]">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#eef2f7] pb-24 lg:pb-10 lg:pt-20">
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] mb-2">Repay Loan</h1>
          <p className="text-[#6b7280] text-sm lg:text-base">Settle your active loan and boost your reputation score.</p>
        </div>

        {!loan ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-[#e5e9f0]">
            <p className="text-[#111827] font-bold text-lg mb-2">No active loan</p>
            <p className="text-[#6b7280] text-sm mb-6">You don't have any funded loans to repay right now.</p>
            <button onClick={() => router.push("/request-loan")} className="bg-[#1a2fb8] text-white rounded-2xl px-6 py-3 font-bold text-sm">
              Request a Loan
            </button>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0]">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase">
                    Loan #{loan.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${daysLeft <= 3 ? "bg-red-100 text-red-600" : "bg-[#fef3c7] text-[#d97706]"}`}>
                    {daysLeft} Days Left
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {[
                    { label: "Principal", value: `$${loan.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "text-[#111827]" },
                    { label: "Accrued Interest", value: `+$${interest.toFixed(2)}`, color: "text-[#d97706]" },
                    { label: "Daily Rate", value: "0.024%", color: "text-[#374151]" },
                    { label: "Due Date", value: loan.due_date ? new Date(loan.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", color: "text-[#374151]" },
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

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}

              {repaid ? (
                <div className="w-full bg-[#4ade80] text-[#14532d] rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="#14532d"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                  Repayment Successful — +10 Reputation
                </div>
              ) : (
                <button
                  onClick={handleRepay}
                  disabled={repaying}
                  className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-70"
                >
                  {repaying ? "Processing..." : `Repay $${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
                </button>
              )}
            </div>

            <div className="w-full lg:flex-1 flex flex-col gap-5">
              <div className="bg-[#f0fdf4] rounded-3xl p-6 border border-[#bbf7d0] flex items-start gap-4">
                <div className="w-10 h-10 bg-[#4ade80] rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#14532d"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#15803d] mb-1">Reputation Boost on Repayment</p>
                  <p className="text-xs text-[#16a34a] leading-relaxed">
                    Repaying on time earns you +10 reputation points and improves your borrowing limit for future loans.
                  </p>
                </div>
              </div>

              <div className="hidden lg:block bg-white rounded-3xl p-6 shadow-sm border border-[#e5e9f0]">
                <p className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-4">Repayment Breakdown</p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: "You're paying", value: `$${totalDue.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                    { label: "Principal cleared", value: `$${loan.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
                    { label: "Interest paid", value: `$${interest.toFixed(2)}` },
                    { label: "Reputation gain", value: "+10 PTS" },
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
        )}
      </div>
      <Navbar />
    </div>
  );
}
