"use client";

import { AlertTriangle, ShieldX, ShieldAlert } from "lucide-react";
import type { RiskLevel, FraudFlag } from "@/services/fraudDetection";

// ─── Blacklist Banner ─────────────────────────────────────────────────────────

export function BlacklistBanner() {
  return (
    <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-300 dark:border-red-700 rounded-2xl px-5 py-4 mb-5">
      <ShieldX size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-bold text-red-700 dark:text-red-300">Account Restricted</p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 leading-relaxed">
          Your account has been restricted due to suspicious activity. You cannot request loans or perform transactions.
          Contact support if you believe this is a mistake.
        </p>
      </div>
    </div>
  );
}

// ─── Risk Badge ───────────────────────────────────────────────────────────────

const RISK_STYLES: Record<RiskLevel, string> = {
  Low:    "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400",
  Medium: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
  High:   "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${RISK_STYLES[level]}`}>
      <ShieldAlert size={11} />
      {level} Risk
    </span>
  );
}

// ─── Suspicious Activity Warning ──────────────────────────────────────────────

interface FraudWarningProps {
  riskLevel: RiskLevel;
  flags: FraudFlag[];
}

export function FraudWarning({ riskLevel, flags }: FraudWarningProps) {
  if (flags.length === 0) return null;

  const isHigh = riskLevel === "High";

  return (
    <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 mb-4 border ${
      isHigh
        ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
        : "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
    }`}>
      <AlertTriangle size={16} className={`flex-shrink-0 mt-0.5 ${isHigh ? "text-red-500" : "text-amber-500"}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-sm font-bold ${isHigh ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
            ⚠ Suspicious activity detected
          </p>
          <RiskBadge level={riskLevel} />
        </div>
        <ul className="space-y-0.5">
          {flags.map((f, i) => (
            <li key={i} className={`text-xs leading-relaxed ${isHigh ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
              · {f.detail}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Fraud Score Indicator (for dashboard/profile) ───────────────────────────

interface FraudScoreCardProps {
  score: number;
  fraudCount: number;
  status: "ACTIVE" | "BLACKLISTED";
}

export function FraudScoreCard({ score, fraudCount, status }: FraudScoreCardProps) {
  const level = score >= 60 ? "High" : score >= 30 ? "Medium" : "Low";

  return (
    <div className={`rounded-2xl p-4 border ${
      status === "BLACKLISTED"
        ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
        : level === "High"
        ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
        : level === "Medium"
        ? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
        : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert size={16} className={
            status === "BLACKLISTED" || level === "High" ? "text-red-500"
            : level === "Medium" ? "text-amber-500"
            : "text-green-500"
          } />
          <span className="text-xs font-bold text-[#374151] dark:text-gray-300 uppercase tracking-widest">
            Fraud Risk
          </span>
        </div>
        <RiskBadge level={level} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-black text-[#111827] dark:text-white">{score}<span className="text-sm font-semibold text-[#6b7280] dark:text-gray-400">/100</span></p>
          <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-0.5">{fraudCount} fraud event{fraudCount !== 1 ? "s" : ""} recorded</p>
        </div>
        {status === "BLACKLISTED" && (
          <span className="text-xs font-bold bg-red-600 text-white px-2.5 py-1 rounded-full">RESTRICTED</span>
        )}
      </div>

      {/* Score bar */}
      <div className="mt-3 h-1.5 bg-[#e5e9f0] dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            level === "High" ? "bg-red-500" : level === "Medium" ? "bg-amber-500" : "bg-green-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
