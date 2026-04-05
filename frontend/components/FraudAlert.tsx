"use client";

import { AlertTriangle, ShieldX, ShieldCheck, Info } from "lucide-react";
import type { FraudFlag } from "@/lib/fraud";

// ─── Blacklist Banner ─────────────────────────────────────────────────────────
export function BlacklistBanner() {
  return (
    <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded-2xl px-5 py-4 mb-5">
      <ShieldX size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-red-700 dark:text-red-300">Account Restricted</p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">
          Your account has been restricted due to suspicious activity. You cannot request loans or perform transactions.
        </p>
      </div>
    </div>
  );
}

// ─── Daily Limit Warning ──────────────────────────────────────────────────────
export function DailyLimitWarning({ loansToday, limit = 3 }: { loansToday: number; limit?: number }) {
  const reached = loansToday >= limit;
  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 mb-4 border ${
      reached
        ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
        : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
    }`}>
      <AlertTriangle size={15} className={`flex-shrink-0 mt-0.5 ${reached ? "text-red-500" : "text-amber-500"}`} />
      <div>
        <p className={`text-sm font-bold ${reached ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
          {reached ? "⚠ Daily loan limit exceeded" : "⚠ Approaching daily loan limit"}
        </p>
        <p className={`text-xs mt-0.5 ${reached ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
          Loans today: {loansToday} / {limit}
          {reached && " — No more loans can be requested today."}
        </p>
      </div>
    </div>
  );
}

// ─── Fraud Flags Warning ──────────────────────────────────────────────────────
export function FraudFlagsWarning({ flags }: { flags: FraudFlag[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl px-4 py-3 mb-4">
      <AlertTriangle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-amber-700 dark:text-amber-300">⚠ Suspicious activity detected</p>
        <ul className="mt-1 space-y-0.5">
          {flags.map((f, i) => (
            <li key={i} className="text-xs text-amber-600 dark:text-amber-400">· {f.detail}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Private Pool Note ────────────────────────────────────────────────────────
export function PrivatePoolNote() {
  return (
    <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5 mb-4">
      <Info size={14} className="text-blue-500 flex-shrink-0" />
      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
        Private pool activity does not affect your credit score.
      </p>
    </div>
  );
}

// ─── Fraud Score Badge ────────────────────────────────────────────────────────
export function FraudScoreBadge({ score }: { score: number }) {
  const level = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";
  const styles = {
    Low:    "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
    Medium: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    High:   "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${styles[level]}`}>
      <ShieldCheck size={11} />
      {level} Risk · {score}/100
    </span>
  );
}
