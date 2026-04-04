/**
 * CreditScoreDisplay Component
 * Main display for credit score with tier badge and optional breakdown
 */

"use client";

import { useState } from "react";
import ProgressBar from "./ProgressBar";
import ScoreBreakdown from "./ScoreBreakdown";
import { getTierColor, type ScoreBreakdown as ScoreBreakdownType } from "@/services/creditScoreService";

interface CreditScoreDisplayProps {
  score: number;
  tier: string;
  breakdown?: ScoreBreakdownType;
  showBreakdown?: boolean;
}

export default function CreditScoreDisplay({
  score,
  tier,
  breakdown,
  showBreakdown = false,
}: CreditScoreDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(showBreakdown);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
      {/* Score Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Credit Score</p>
          <p className="text-4xl font-black text-gray-900 dark:text-white">
            {score}
            <span className="text-lg text-gray-500 dark:text-gray-400"> / 1000</span>
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full font-bold ${getTierColor(tier)}`}>
          {tier}
        </span>
      </div>
      
      {/* Progress Bar */}
      <ProgressBar score={score} />
      
      {/* Toggle Breakdown Button */}
      {breakdown && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          {isExpanded ? "Hide Details" : "Show Details"}
        </button>
      )}
      
      {/* Breakdown */}
      {isExpanded && breakdown && (
        <ScoreBreakdown breakdown={breakdown} />
      )}
    </div>
  );
}
