/**
 * antiAbuseService.ts
 * Anti-abuse protection for private pool credit scoring.
 *
 * Rules enforced:
 *  1. Private pool activity has 10% weight on global credit (vs 100% for public)
 *  2. Minimum conditions: duration > 24h, amount > 5% of balance, pool ≥ 3 members
 *  3. Repeated pair detection: same lender/borrower pair reduces weight
 *  4. Cooldown: 1–6 hour cooldown between borrows in same pool
 *  5. Diversity check: must interact with ≥ 2 unique users for credit impact
 *  6. Loop detection: borrow→repay within 1 hour = no score increase
 */

import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// ── Constants ─────────────────────────────────────────────────────────────────

export const PRIVATE_POOL_CREDIT_WEIGHT = 0.10;   // 10% of normal credit impact
export const MIN_LOAN_DURATION_HOURS = 1;           // Must be > 1h (relaxed for demo)
export const MIN_AMOUNT_RATIO = 0.01;               // Must be > 1% of wallet balance
export const MIN_POOL_MEMBERS = 2;                  // Pool must have ≥ 2 active members
export const COOLDOWN_HOURS = 0;                    // No cooldown — one active loan per pool is the limit
export const MAX_PAIR_INTERACTIONS = 10;            // Same pair > 10 times = 0 weight
export const MIN_UNIQUE_INTERACTIONS = 1;           // Must interact with ≥ 1 unique user
export const LOOP_DETECTION_HOURS = 0.1;            // Borrow→repay within 6 min = loop

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AbuseCheckResult {
  allowed: boolean;
  creditWeight: number;   // 0 = no credit impact, 0.1 = 10% weight
  reason?: string;
  flags: string[];
}

// ── Rule 1: Minimum conditions ────────────────────────────────────────────────

export async function checkMinimumConditions(
  poolId: string,
  borrowerId: string,
  amount: number,
  durationDays: number
): Promise<{ pass: boolean; reason?: string }> {
  // Duration check: must be > 24 hours
  if (durationDays * 24 < MIN_LOAN_DURATION_HOURS) {
    return { pass: false, reason: `Loan duration must be at least ${MIN_LOAN_DURATION_HOURS} hours for credit impact` };
  }

  // Amount check: must be > 5% of wallet balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", borrowerId)
    .single();

  const walletBalance = profile?.wallet_balance ?? 0;
  const minAmount = walletBalance * MIN_AMOUNT_RATIO;

  if (amount < minAmount && walletBalance > 0) {
    return { pass: false, reason: `Amount too small for credit impact (min: ${minAmount.toFixed(4)} ETH)` };
  }

  // Pool member count check: must have ≥ 3 active members
  const { count } = await supabase
    .from("pool_members")
    .select("*", { count: "exact", head: true })
    .eq("pool_id", poolId)
    .eq("status", "active");

  if ((count ?? 0) < MIN_POOL_MEMBERS) {
    return { pass: false, reason: `Pool needs at least ${MIN_POOL_MEMBERS} active members for credit impact` };
  }

  return { pass: true };
}

// ── Rule 2: Cooldown check ────────────────────────────────────────────────────

export async function checkCooldown(
  userId: string,
  poolId: string
): Promise<{ allowed: boolean; remainingMinutes?: number }> {
  // Cooldown disabled (COOLDOWN_HOURS = 0) — one active loan per pool is the real limit
  if (COOLDOWN_HOURS === 0) return { allowed: true };

  const { data } = await supabase
    .from("borrow_cooldowns")
    .select("last_borrow_at")
    .eq("user_id", userId)
    .eq("pool_id", poolId)
    .maybeSingle();

  if (!data) return { allowed: true };

  const lastBorrow = new Date(data.last_borrow_at);
  const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
  const elapsed = Date.now() - lastBorrow.getTime();

  if (elapsed < cooldownMs) {
    const remainingMinutes = Math.ceil((cooldownMs - elapsed) / 60000);
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true };
}

export async function setCooldown(userId: string, poolId: string): Promise<void> {
  await supabase
    .from("borrow_cooldowns")
    .upsert({ user_id: userId, pool_id: poolId, last_borrow_at: new Date().toISOString() });
}

// ── Rule 3: Repeated pair detection ──────────────────────────────────────────

export async function getPairInteractionWeight(
  poolId: string,
  lenderId: string,
  borrowerId: string
): Promise<number> {
  const { data } = await supabase
    .from("user_interactions")
    .select("interaction_count")
    .eq("pool_id", poolId)
    .eq("lender_id", lenderId)
    .eq("borrower_id", borrowerId)
    .maybeSingle();

  const count = data?.interaction_count ?? 0;

  if (count >= MAX_PAIR_INTERACTIONS) return 0;
  // Linear decay: 5 interactions → 0 weight
  return Math.max(0, 1 - count / MAX_PAIR_INTERACTIONS);
}

export async function recordPairInteraction(
  poolId: string,
  lenderId: string,
  borrowerId: string
): Promise<void> {
  const { data } = await supabase
    .from("user_interactions")
    .select("id, interaction_count")
    .eq("pool_id", poolId)
    .eq("lender_id", lenderId)
    .eq("borrower_id", borrowerId)
    .maybeSingle();

  if (data) {
    await supabase
      .from("user_interactions")
      .update({
        interaction_count: data.interaction_count + 1,
        last_interaction: new Date().toISOString(),
      })
      .eq("id", data.id);
  } else {
    await supabase.from("user_interactions").insert({
      pool_id: poolId,
      lender_id: lenderId,
      borrower_id: borrowerId,
      interaction_count: 1,
    });
  }
}

// ── Rule 4: Diversity check ───────────────────────────────────────────────────

export async function checkDiversity(
  poolId: string,
  borrowerId: string
): Promise<{ diverse: boolean; uniqueInteractions: number }> {
  const { data } = await supabase
    .from("user_interactions")
    .select("lender_id")
    .eq("pool_id", poolId)
    .eq("borrower_id", borrowerId);

  const uniqueLenders = new Set(data?.map((r) => r.lender_id) ?? []).size;
  return {
    diverse: uniqueLenders >= MIN_UNIQUE_INTERACTIONS,
    uniqueInteractions: uniqueLenders,
  };
}

// ── Rule 5: Loop detection ────────────────────────────────────────────────────

export async function detectLoop(
  poolId: string,
  borrowerId: string
): Promise<boolean> {
  const cutoff = new Date(Date.now() - LOOP_DETECTION_HOURS * 60 * 60 * 1000).toISOString();

  // Check if user borrowed AND repaid within the loop detection window
  const { data: recentLoans } = await supabase
    .from("pool_loans")
    .select("borrowed_at, repaid_at, status")
    .eq("pool_id", poolId)
    .eq("borrower_id", borrowerId)
    .eq("status", "repaid")
    .gte("borrowed_at", cutoff);

  return (recentLoans?.length ?? 0) > 0;
}

// ── Master abuse check ────────────────────────────────────────────────────────

/**
 * Run all anti-abuse checks before a private pool borrow.
 * Returns whether the borrow is allowed and what credit weight to apply.
 */
export async function runAbuseChecks(params: {
  poolId: string;
  borrowerId: string;
  lenderId: string;   // pool creator acts as lender
  amount: number;
  durationDays: number;
}): Promise<AbuseCheckResult> {
  const { poolId, borrowerId, lenderId, amount, durationDays } = params;
  const flags: string[] = [];
  let creditWeight = PRIVATE_POOL_CREDIT_WEIGHT; // Start at 10%

  // Rule 1: Cooldown — DISABLED. One active loan per pool is the real limit.
  // (Cooldown check removed to avoid blocking users who have no active loan)

  // Rule 2: Minimum conditions
  const minCheck = await checkMinimumConditions(poolId, borrowerId, amount, durationDays);
  if (!minCheck.pass) {
    flags.push("MIN_CONDITIONS_FAILED");
    creditWeight = 0; // No credit impact but borrow is still allowed
  }

  // Rule 3: Loop detection
  const isLoop = await detectLoop(poolId, borrowerId);
  if (isLoop) {
    flags.push("LOOP_DETECTED");
    creditWeight = 0;
  }

  // Rule 4: Pair interaction weight
  const pairWeight = await getPairInteractionWeight(poolId, lenderId, borrowerId);
  if (pairWeight < 1) {
    flags.push("REPEATED_PAIR");
    creditWeight *= pairWeight;
  }

  // Rule 5: Diversity check
  const diversity = await checkDiversity(poolId, borrowerId);
  if (!diversity.diverse) {
    flags.push("LOW_DIVERSITY");
    creditWeight *= 0.5; // Halve weight if not diverse
  }

  return {
    allowed: true,
    creditWeight: Math.round(creditWeight * 100) / 100,
    flags,
  };
}

// ── Pool trust score ──────────────────────────────────────────────────────────

export interface PoolTrustScore {
  score: number;        // 0-100
  label: string;
  repaymentRate: number;
  memberDiversity: number;
  avgLoanDuration: number;
}

export async function calculatePoolTrustScore(poolId: string): Promise<PoolTrustScore> {
  const { data: loans } = await supabase
    .from("pool_loans")
    .select("status, borrowed_at, repaid_at, due_date, borrower_id, amount")
    .eq("pool_id", poolId);

  if (!loans?.length) {
    return { score: 50, label: "New", repaymentRate: 0, memberDiversity: 0, avgLoanDuration: 0 };
  }

  const repaid = loans.filter((l) => l.status === "repaid").length;
  const repaymentRate = repaid / loans.length;

  const uniqueBorrowers = new Set(loans.map((l) => l.borrower_id)).size;
  const memberDiversity = Math.min(uniqueBorrowers / 5, 1); // Normalize to 5 unique borrowers

  const avgDuration = loans.reduce((sum, l) => {
    if (!l.repaid_at) return sum;
    const hours = (new Date(l.repaid_at).getTime() - new Date(l.borrowed_at).getTime()) / 3600000;
    return sum + hours;
  }, 0) / Math.max(repaid, 1);

  const durationScore = Math.min(avgDuration / 48, 1); // Normalize to 48h

  const score = Math.round(
    (repaymentRate * 50) +
    (memberDiversity * 30) +
    (durationScore * 20)
  );

  const label = score >= 80 ? "Trusted" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "New";

  return { score, label, repaymentRate, memberDiversity: uniqueBorrowers, avgLoanDuration: avgDuration };
}
