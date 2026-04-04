"use client";

interface LoanCardProps {
  borrower: string;
  amount: number;
  reason: string;
  duration: string;
  onFund?: () => void;
}

export default function LoanCard({ borrower, amount, reason, duration, onFund }: LoanCardProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#e5e9f0]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1a2fb8] flex items-center justify-center text-white font-bold text-sm">
            {borrower.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-[#111827] text-sm">{borrower}</p>
            <p className="text-xs text-[#6b7280]">{duration}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-[#111827] text-base">${amount.toLocaleString()}</p>
          <p className="text-xs text-[#6b7280]">USDC</p>
        </div>
      </div>
      <p className="text-sm text-[#6b7280] mb-4 line-clamp-2">{reason}</p>
      <button
        onClick={onFund}
        className="w-full bg-[#1a2fb8] text-white rounded-xl py-3 font-semibold text-sm hover:bg-[#1527a0] transition-all active:scale-95"
      >
        Fund Loan
      </button>
    </div>
  );
}
