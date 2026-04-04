/**
 * ScoreBreakdown Component
 * Displays detailed breakdown of credit score factors
 */

import Tooltip from "./Tooltip";
import type { ScoreBreakdown as ScoreBreakdownType } from "@/services/creditScoreService";

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdownType;
}

export default function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const factors = [
    {
      name: "Repayment Reliability",
      value: breakdown.repaymentReliability,
      weight: 0.25,
      tooltip: "Percentage of loans repaid on time. This is the most important factor (25% weight).",
      displayValue: `${(breakdown.repaymentReliability * 100).toFixed(1)}%`,
    },
    {
      name: "Wallet History",
      value: breakdown.walletHistory,
      weight: 0.15,
      tooltip: "Account age and maturity. Older accounts score higher.",
      displayValue: breakdown.walletHistory.toFixed(2),
    },
    {
      name: "Liquidity Strength",
      value: breakdown.liquidityStrength,
      weight: 0.15,
      tooltip: "Your available assets vs borrowed amount. Higher ratio means better financial cushion.",
      displayValue: `${breakdown.liquidityStrength.toFixed(2)}x`,
    },
    {
      name: "Volatility Score",
      value: breakdown.volatilityScore,
      weight: 0.10,
      tooltip: "Portfolio stability. Lower volatility = higher score. Stablecoins increase this.",
      displayValue: `${(breakdown.volatilityScore * 100).toFixed(1)}%`,
    },
    {
      name: "Collateral Stability",
      value: breakdown.collateralStability,
      weight: 0.15,
      tooltip: "Stablecoin ratio in collateral. Higher stablecoin % = better score.",
      displayValue: `${(breakdown.collateralStability * 100).toFixed(1)}%`,
    },
    {
      name: "Activity Score",
      value: breakdown.activityScore,
      weight: 0.10,
      tooltip: "Platform engagement in last 30 days. More transactions = higher score.",
      displayValue: `${(breakdown.activityScore * 100).toFixed(1)}%`,
    },
    {
      name: "Default Risk",
      value: breakdown.defaultRisk,
      weight: -0.05,
      tooltip: "Defaults hurt your score. This is a penalty factor (-5% weight).",
      displayValue: breakdown.defaultRisk > 0 ? `${(breakdown.defaultRisk * 100).toFixed(1)}%` : "None",
    },
    {
      name: "Liquidation Risk",
      value: breakdown.liquidationRisk,
      weight: -0.05,
      tooltip: "Liquidation history penalty. Avoid liquidations to maintain good score.",
      displayValue: breakdown.liquidationRisk > 0 ? `${(breakdown.liquidationRisk * 100).toFixed(1)}%` : "None",
    },
  ];
  
  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">
        Score Breakdown
      </p>
      
      <div className="space-y-3">
        {factors.map((factor) => {
          const contribution = factor.value * factor.weight;
          const isPositive = contribution >= 0;
          
          return (
            <div key={factor.name} className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {factor.name}
                  </span>
                  <Tooltip text={factor.tooltip} />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  Value: {factor.displayValue} × Weight: {factor.weight > 0 ? '+' : ''}{(factor.weight * 100).toFixed(0)}%
                </span>
              </div>
              <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{contribution.toFixed(2)}
              </span>
            </div>
          );
        })}
        
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Weighted Sum
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {breakdown.weightedSum.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Sigmoid function maps this to final score
          </p>
        </div>
        
        <div className="pt-2">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900 dark:text-white">
              Final Score
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {breakdown.finalScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
