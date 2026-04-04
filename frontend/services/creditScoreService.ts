/**
 * creditScoreService.ts
 * Advanced DeFi Credit Scoring System
 * 
 * Multi-factor sigmoid-based credit scoring with 8 factors:
 * - R: Repayment Reliability (25%)
 * - H: Wallet History (15%)
 * - L: Liquidity Strength (15%)
 * - V: Volatility Score (10%)
 * - C: Collateral Stability (15%)
 * - A: Activity Score (10%)
 * - D: Default Risk (-5%)
 * - X: Liquidation Risk (-5%)
 * 
 * Score range: 300-1000
 * New users default: 500
 */

import { createClient } from "@/utils/supabase/client";

// ============================================================================
// INTERFACES & TYPES
// ============================================================================

export interface UserCreditData {
  // Repayment metrics
  totalLoans: number;
  onTimeRepayments: number;
  successfulRepayments: number;
  defaults: number;
  liquidations: number; // NEW
  
  // Financial metrics
  liquidAssets: number; // wallet_balance
  totalBorrowed: number; // current active borrows
  totalBorrowedAmount: number; // lifetime
  collateralValue: number; // NEW - for health factor
  
  // Activity metrics
  walletAgeDays: number;
  transactionsLast30Days: number;
  lastActivityDate: Date;
  
  // Portfolio metrics (NEW)
  stablecoinRatio: number; // % of portfolio in stablecoins
  volatileAssetRatio: number; // % of portfolio in volatile assets
  
  // Current score
  currentScore?: number;
}

export interface ScoreBreakdown {
  repaymentReliability: number; // R
  walletHistory: number; // H
  liquidityStrength: number; // L
  volatilityScore: number; // V (NEW)
  collateralStability: number; // C (NEW)
  activityScore: number; // A
  defaultRisk: number; // D
  liquidationRisk: number; // X (NEW)
  weightedSum: number; // x
  finalScore: number; // 300-1000
}

export interface CreditScoreResult {
  score: number;
  tier: string;
  breakdown: ScoreBreakdown;
  healthFactor: number; // NEW
  scoreDecay: number; // NEW - points lost to decay
  previousScore?: number;
  change?: number;
}

// ============================================================================
// FACTOR CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate Repayment Reliability (R)
 * Measures on-time repayment rate
 * Weight: 30%
 */
function calculateRepaymentReliability(data: UserCreditData): number {
  if (data.totalLoans === 0) {
    return 0.5; // Default for new users
  }
  
  return data.onTimeRepayments / data.totalLoans;
}

/**
 * Calculate Wallet History (H)
 * Measures account maturity using logarithmic scaling
 * Weight: 20%
 * Adjusted to be more conservative
 */
function calculateWalletHistory(data: UserCreditData): number {
  // More conservative scaling: divide by 15 instead of 10
  return Math.log(1 + data.walletAgeDays) / 15;
}

/**
 * Calculate Liquidity Strength (L)
 * Measures financial cushion (assets vs borrowed)
 * Weight: 20%
 * Adjusted to be more conservative
 */
function calculateLiquidityStrength(data: UserCreditData): number {
  const ratio = data.liquidAssets / Math.max(data.totalBorrowed, 1);
  // Clamp at 1.5 instead of 2 for more conservative scoring
  return Math.min(ratio, 1.5);
}

/**
 * Calculate Activity Score (A)
 * Measures platform engagement
 * Weight: 20%
 * Adjusted to be more conservative
 */
function calculateActivityScore(data: UserCreditData): number {
  const rawScore = Math.log(1 + data.transactionsLast30Days);
  // Normalize to 0-1, but divide by 7 instead of 5 for more conservative scoring
  return Math.min(rawScore / 7, 1);
}

/**
 * Calculate Default Risk (D)
 * Penalizes defaults
 * Weight: -5%
 */
function calculateDefaultRisk(data: UserCreditData): number {
  return data.defaults / Math.max(data.totalLoans, 1);
}

/**
 * Calculate Volatility Score (V)
 * Rewards stable portfolio composition
 * Weight: 10%
 */
function calculateVolatilityScore(data: UserCreditData): number {
  // Higher stablecoin ratio = better score
  // Inverse of volatile asset ratio
  return 1 - data.volatileAssetRatio;
}

/**
 * Calculate Collateral Stability (C)
 * Rewards stablecoin-heavy collateral
 * Weight: 15%
 */
function calculateCollateralStability(data: UserCreditData): number {
  // Direct mapping of stablecoin ratio
  return data.stablecoinRatio;
}

/**
 * Calculate Liquidation Risk (X)
 * Penalizes liquidation history
 * Weight: -5%
 */
function calculateLiquidationRisk(data: UserCreditData): number {
  return data.liquidations / Math.max(data.totalLoans, 1);
}

// ============================================================================
// WEIGHTED MODEL & SIGMOID
// ============================================================================

/**
 * Apply weighted model to factors
 * Updated weights for 8-factor model
 */
function applyWeightedModel(breakdown: ScoreBreakdown): number {
  const x = 
    0.25 * breakdown.repaymentReliability +
    0.15 * breakdown.walletHistory +
    0.15 * breakdown.liquidityStrength +
    0.10 * breakdown.volatilityScore +
    0.15 * breakdown.collateralStability +
    0.10 * breakdown.activityScore -
    0.05 * breakdown.defaultRisk -
    0.05 * breakdown.liquidationRisk;
  
  return x;
}

/**
 * Sigmoid activation function with adjustable steepness
 * Maps any real number to 0-1 range with smooth curve
 * Using k=2 for gentler slope (less dramatic changes)
 */
function sigmoid(x: number, k: number = 2): number {
  return 1 / (1 + Math.exp(-k * x));
}

/**
 * Normalize score to 300-1000 range with dampening
 * Uses a more gradual mapping to prevent large jumps
 */
function normalizeScore(weightedSum: number, currentScore?: number): number {
  // Use gentler sigmoid with k=2
  const sigmoidValue = sigmoid(weightedSum, 2);
  
  // Map to 300-1000 range
  let newScore = 300 + 700 * sigmoidValue;
  
  // Apply dampening if there's a previous score
  // This prevents dramatic jumps by limiting change to ±50 points per recalculation
  if (currentScore !== undefined && currentScore > 0) {
    const maxChange = 50;
    const scoreDiff = newScore - currentScore;
    
    if (Math.abs(scoreDiff) > maxChange) {
      newScore = currentScore + (scoreDiff > 0 ? maxChange : -maxChange);
    }
  }
  
  return newScore;
}

// ============================================================================
// SCORE DECAY
// ============================================================================

/**
 * Calculate Health Factor
 * DeFi-style health metric
 */
export function calculateHealthFactor(collateralValue: number, borrowedValue: number): number {
  if (borrowedValue === 0) return Infinity;
  return collateralValue / borrowedValue;
}

/**
 * Get health factor color
 */
export function getHealthFactorColor(healthFactor: number): string {
  if (healthFactor === Infinity) return "text-gray-500";
  if (healthFactor > 1.5) return "text-green-600";
  if (healthFactor >= 1.2) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Format health factor for display
 */
export function formatHealthFactor(healthFactor: number): string {
  if (healthFactor === Infinity) return "—";
  return healthFactor.toFixed(2);
}

/**
 * Calculate days since last activity
 */
function getDaysInactive(lastActivityDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastActivityDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Apply exponential decay for inactive users
 * Decay starts after 7 days of inactivity
 */
export function applyScoreDecay(score: number, daysInactive: number): number {
  if (daysInactive <= 7) {
    return score;
  }
  
  const decayedScore = score * Math.exp(-0.002 * daysInactive);
  return Math.max(300, decayedScore);
}

// ============================================================================
// CREDIT TIER HELPERS
// ============================================================================

/**
 * Get credit tier from score
 */
export function getCreditTier(score: number): string {
  if (score >= 900) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 500) return "Fair";
  return "Poor";
}

/**
 * Get tier color classes
 */
export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    Excellent: "bg-green-500 text-white",
    Good: "bg-blue-500 text-white",
    Fair: "bg-yellow-500 text-white",
    Poor: "bg-red-500 text-white",
  };
  return colors[tier] || "bg-gray-500 text-white";
}

/**
 * Get default breakdown for new users
 */
export function getDefaultBreakdown(): ScoreBreakdown {
  return {
    repaymentReliability: 0.5,
    walletHistory: 0,
    liquidityStrength: 1,
    volatilityScore: 0.5,
    collateralStability: 0.5,
    activityScore: 0,
    defaultRisk: 0,
    liquidationRisk: 0,
    weightedSum: 0.35,
    finalScore: 500,
  };
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate credit score from user data
 * Returns score in range 300-1000
 */
export function calculateCreditScore(data: UserCreditData): CreditScoreResult {
  // Handle new users
  if (data.totalLoans === 0 && data.walletAgeDays < 7) {
    return {
      score: 500,
      tier: getCreditTier(500),
      breakdown: getDefaultBreakdown(),
      healthFactor: calculateHealthFactor(data.collateralValue, data.totalBorrowed),
      scoreDecay: 0,
    };
  }
  
  // Calculate all factors
  const breakdown: ScoreBreakdown = {
    repaymentReliability: calculateRepaymentReliability(data),
    walletHistory: calculateWalletHistory(data),
    liquidityStrength: calculateLiquidityStrength(data),
    volatilityScore: calculateVolatilityScore(data),
    collateralStability: calculateCollateralStability(data),
    activityScore: calculateActivityScore(data),
    defaultRisk: calculateDefaultRisk(data),
    liquidationRisk: calculateLiquidationRisk(data),
    weightedSum: 0,
    finalScore: 0,
  };
  
  // Apply weighted model
  breakdown.weightedSum = applyWeightedModel(breakdown);
  
  // Normalize to 300-1000 range with dampening
  let score = normalizeScore(breakdown.weightedSum, data.currentScore);
  
  // Calculate decay
  const daysInactive = getDaysInactive(data.lastActivityDate);
  let scoreDecay = 0;
  
  // Apply decay if inactive
  if (daysInactive > 7) {
    const scoreBeforeDecay = score;
    score = applyScoreDecay(score, daysInactive);
    scoreDecay = scoreBeforeDecay - score;
  }
  
  // Round and clamp
  score = Math.round(score);
  score = Math.max(300, Math.min(1000, score));
  
  breakdown.finalScore = score;
  
  // Calculate health factor
  const healthFactor = calculateHealthFactor(data.collateralValue, data.totalBorrowed);
  
  return {
    score,
    tier: getCreditTier(score),
    breakdown,
    healthFactor,
    scoreDecay: Math.round(scoreDecay),
    previousScore: data.currentScore,
    change: data.currentScore ? score - data.currentScore : undefined,
  };
}

// ============================================================================
// DATA GATHERING
// ============================================================================

/**
 * Gather all data needed for credit score calculation
 */
export async function gatherUserCreditData(userId: string): Promise<UserCreditData> {
  const supabase = createClient();
  
  // Get reputation data
  const { data: reputation } = await supabase
    .from("reputation")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance, created_at")
    .eq("id", userId)
    .single();
  
  // Get loan data
  const { data: loans } = await supabase
    .from("loans")
    .select("due_date, status, created_at, repaid_at")
    .eq("borrower_id", userId);
  
  // Calculate on-time repayments
  const onTimeRepayments = loans?.filter(loan => {
    if (loan.status !== "repaid" || !loan.repaid_at) return false;
    const dueDate = new Date(loan.due_date);
    const repaidDate = new Date(loan.repaid_at);
    return repaidDate <= dueDate;
  }).length || 0;
  
  // Get current active borrows
  const { data: activeLoans } = await supabase
    .from("loans")
    .select("amount")
    .eq("borrower_id", userId)
    .eq("status", "active");
  
  const totalBorrowed = activeLoans?.reduce((sum, loan) => sum + loan.amount, 0) || 0;
  
  // Get transactions last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: transactionsLast30Days } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString());
  
  // Get last activity date
  const { data: lastTransaction } = await supabase
    .from("transactions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  // Calculate wallet age
  const walletAgeDays = profile?.created_at 
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Calculate portfolio metrics (simplified - assume 50/50 for now)
  // In production, this would analyze actual holdings
  const stablecoinRatio = 0.5; // TODO: Calculate from actual portfolio
  const volatileAssetRatio = 0.5; // TODO: Calculate from actual portfolio
  
  // Calculate collateral value (simplified - use wallet balance as proxy)
  const collateralValue = profile?.wallet_balance || 0;
  
  return {
    totalLoans: reputation?.total_loans || 0,
    onTimeRepayments,
    successfulRepayments: reputation?.successful_repayments || 0,
    defaults: reputation?.defaults || 0,
    liquidations: 0, // TODO: Track liquidations in database
    liquidAssets: profile?.wallet_balance || 0,
    totalBorrowed,
    totalBorrowedAmount: reputation?.total_borrowed_amount || 0,
    collateralValue,
    walletAgeDays,
    transactionsLast30Days: transactionsLast30Days || 0,
    lastActivityDate: lastTransaction?.created_at 
      ? new Date(lastTransaction.created_at)
      : new Date(),
    stablecoinRatio,
    volatileAssetRatio,
    currentScore: reputation?.credit_score,
  };
}

// ============================================================================
// CACHING
// ============================================================================

const scoreCache = new Map<string, { score: number; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export function getCachedScore(userId: string): number | null {
  const cached = scoreCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.score;
  }
  return null;
}

export function setCachedScore(userId: string, score: number): void {
  scoreCache.set(userId, { score, timestamp: Date.now() });
}
