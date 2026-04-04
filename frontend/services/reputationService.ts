/**
 * reputationService.ts
 * Maps to: Reputation.sol
 *
 * Solidity equivalent:
 *   mapping(address => uint256) public creditScore;
 *   mapping(address => uint256) public totalLoans;
 *   mapping(address => uint256) public successfulRepayments;
 *   mapping(address => uint256) public defaults;
 */

import { createClient } from "@/utils/supabase/client";
import { getCreditTierKey, getMaxLTV, getMaxLTVFromTier } from "@/utils/creditTier";

export { getCreditTierKey as getCreditTier, getMaxLTV, getMaxLTVFromTier };

const supabase = createClient();

export interface ReputationData {
  credit_score: number;
  total_loans: number;
  successful_repayments: number;
  defaults: number;
  total_borrowed_amount: number;
}

// LTV tiers — delegates to creditTier utility
// (kept for backward compatibility; use getMaxLTV from @/utils/creditTier directly)

// Ensure reputation row exists for user (called on signup / first action)
export async function ensureReputation(userId: string): Promise<void> {
  const { data } = await supabase
    .from("reputation")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    await supabase
      .from("reputation")
      .insert([{ user_id: userId, credit_score: 500 }]);
  }
}

// Get user reputation — maps to getCreditScore() in Solidity
export async function getReputation(userId: string): Promise<ReputationData> {
  // Graceful fallback if reputation table doesn't exist yet
  try {
    await ensureReputation(userId);

    const { data, error } = await supabase
      .from("reputation")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) throw new Error(error.message);
    return data;
  } catch {
    // Table not yet created — return safe defaults so app doesn't crash
    // Run frontend/sql/defi-schema.sql in Supabase to fix this
    console.warn("reputation table not found — using defaults. Run defi-schema.sql in Supabase.");
    return {
      credit_score: 500,
      total_loans: 0,
      successful_repayments: 0,
      defaults: 0,
      total_borrowed_amount: 0,
    };
  }
}

// Record new loan — maps to recordLoan() in Solidity
export async function recordLoan(userId: string, amount: number): Promise<void> {
  const rep = await getReputation(userId);

  const { error } = await supabase
    .from("reputation")
    .update({
      total_loans: rep.total_loans + 1,
      total_borrowed_amount: rep.total_borrowed_amount + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// Record repayment — maps to recordRepayment() in Solidity
// on-time: +20, late: +5
export async function recordRepayment(userId: string, onTime: boolean): Promise<void> {
  const rep = await getReputation(userId);
  const delta = onTime ? 20 : 5;
  const newScore = Math.min(1000, rep.credit_score + delta);

  const { error } = await supabase
    .from("reputation")
    .update({
      credit_score: newScore,
      successful_repayments: rep.successful_repayments + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

// Record default — maps to recordDefault() in Solidity
// score -= 75, clamped to 0
export async function recordDefault(userId: string): Promise<void> {
  const rep = await getReputation(userId);
  const newScore = Math.max(0, rep.credit_score - 75);

  const { error } = await supabase
    .from("reputation")
    .update({
      credit_score: newScore,
      defaults: rep.defaults + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
