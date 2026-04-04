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

const supabase = createClient();

export interface ReputationData {
  credit_score: number;
  total_loans: number;
  successful_repayments: number;
  defaults: number;
  total_borrowed_amount: number;
}

// LTV tiers based on credit score — maps to getCreditTier() in Solidity
export function getMaxLTV(creditScore: number): number {
  if (creditScore > 800) return 0.85;  // 85%
  if (creditScore >= 600) return 0.75; // 75%
  return 0.60;                          // 60%
}

export function getCreditTier(creditScore: number): string {
  if (creditScore > 800) return "Excellent";
  if (creditScore >= 600) return "Good";
  if (creditScore >= 400) return "Fair";
  return "Poor";
}

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
  await ensureReputation(userId);

  const { data, error } = await supabase
    .from("reputation")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
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
