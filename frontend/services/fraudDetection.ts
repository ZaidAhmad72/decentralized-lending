/**
 * fraudDetection.ts
 * Rule-based fraud detection system for the decentralized lending platform.
 *
 * Rules:
 *   R1 — Rapid Transactions:    >5 txns in 1 minute       → +20
 *   R2 — Abnormal Loan Amount:  amount > 2x avg tx        → +25
 *   R3 — Default / Missed:      loan defaulted             → +40
 *   R4 — Sudden Activity Spike: activity 3x recent avg    → +15
 *
 * Trust score impact: trust_score -= fraud_score * 0.3
 * Blacklist: fraud_score > 80 OR fraud_count >= 3
 */

import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

export type FraudAction = "loan_request" | "transaction" | "repayment" | "default";
export type FraudStatus = "ACTIVE" | "BLACKLISTED";
export type RiskLevel = "Low" | "Medium" | "High";

export interface FraudFlag {
  rule: string;
  score: number;
  detail: string;
  timestamp: string;
}

export interface FraudResult {
  fraud_score: number;
  flags: FraudFlag[];
  risk_level: RiskLevel;
  is_blacklisted: boolean;
}

export interface FraudProfile {
  fraud_score: number;
  fraud_flags: FraudFlag[];
  fraud_count: number;
  status: FraudStatus;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 60) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

function flag(rule: string, score: number, detail: string): FraudFlag {
  return { rule, score, detail, timestamp: new Date().toISOString() };
}

// ─── Rule Evaluators ─────────────────────────────────────────────────────────

/** R1: >5 transactions within the last 60 seconds */
async function checkRapidTransactions(userId: string): Promise<FraudFlag | null> {
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);

  if ((count ?? 0) > 5) {
    return flag("RAPID_TRANSACTIONS", 20, `${count} transactions in the last 60 seconds`);
  }
  return null;
}

/** R2: Requested loan amount > 2x user's average transaction amount */
async function checkAbnormalLoanAmount(userId: string, amount: number): Promise<FraudFlag | null> {
  const { data } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!data || data.length < 3) return null; // not enough history

  const avg = data.reduce((s, t) => s + (t.amount ?? 0), 0) / data.length;
  if (avg > 0 && amount > avg * 2) {
    return flag("ABNORMAL_LOAN_AMOUNT", 25, `Requested ${amount.toFixed(4)} ETH vs avg ${avg.toFixed(4)} ETH (${(amount / avg).toFixed(1)}x)`);
  }
  return null;
}

/** R3: User has a defaulted loan */
async function checkDefault(userId: string): Promise<FraudFlag | null> {
  const { count } = await supabase
    .from("loans")
    .select("id", { count: "exact", head: true })
    .eq("borrower_id", userId)
    .eq("status", "defaulted");

  if ((count ?? 0) > 0) {
    return flag("LOAN_DEFAULT", 40, `${count} defaulted loan(s) on record`);
  }
  return null;
}

/** R4: Activity in last 10 mins is 3x the hourly average */
async function checkSuddenActivitySpike(userId: string): Promise<FraudFlag | null> {
  const tenMinAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

  const [{ count: recent }, { count: hourly }] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", tenMinAgo),
    supabase.from("transactions").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", oneHourAgo),
  ]);

  const recentRate = (recent ?? 0) * 6; // extrapolate 10min → per hour
  const hourlyAvg = hourly ?? 0;

  if (hourlyAvg > 2 && recentRate > hourlyAvg * 3) {
    return flag("SUDDEN_ACTIVITY_SPIKE", 15, `Activity rate ${recentRate}/hr vs avg ${hourlyAvg}/hr`);
  }
  return null;
}

// ─── Core: detectFraud ────────────────────────────────────────────────────────

/**
 * Run all applicable fraud rules for a given action.
 * Returns aggregated fraud_score, flags, risk level, and blacklist status.
 */
export async function detectFraud(
  userId: string,
  action: FraudAction,
  amount?: number
): Promise<FraudResult> {
  const checks: Promise<FraudFlag | null>[] = [];

  // Always check rapid transactions and activity spike
  checks.push(checkRapidTransactions(userId));
  checks.push(checkSuddenActivitySpike(userId));

  // Loan-specific checks
  if (action === "loan_request" && amount !== undefined) {
    checks.push(checkAbnormalLoanAmount(userId, amount));
  }

  // Default check on repayment processing
  if (action === "repayment" || action === "default") {
    checks.push(checkDefault(userId));
  }

  const results = await Promise.all(checks);
  const flags = results.filter((f): f is FraudFlag => f !== null);
  const fraud_score = Math.min(100, flags.reduce((s, f) => s + f.score, 0));
  const risk_level = getRiskLevel(fraud_score);

  // Fetch existing fraud_count to determine blacklist
  const { data: rep } = await supabase
    .from("reputation")
    .select("fraud_count, status")
    .eq("user_id", userId)
    .maybeSingle();

  const existing_count = rep?.fraud_count ?? 0;
  const new_count = flags.length > 0 ? existing_count + 1 : existing_count;
  const is_blacklisted = fraud_score > 80 || new_count >= 3 || rep?.status === "BLACKLISTED";

  return { fraud_score, flags, risk_level, is_blacklisted };
}

// ─── Core: updateFraudReputation ─────────────────────────────────────────────

/**
 * Persist fraud result to the reputation table.
 * Adjusts credit_score and applies blacklist if triggered.
 */
export async function updateFraudReputation(
  userId: string,
  result: FraudResult
): Promise<void> {
  if (result.flags.length === 0) return; // nothing to update

  const { data: rep } = await supabase
    .from("reputation")
    .select("credit_score, fraud_score, fraud_flags, fraud_count, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (!rep) return;

  const existingFlags: FraudFlag[] = Array.isArray(rep.fraud_flags) ? rep.fraud_flags : [];
  const mergedFlags = [...existingFlags, ...result.flags].slice(-50); // keep last 50

  const newFraudScore = Math.min(100, (rep.fraud_score ?? 0) + result.fraud_score);
  const trustPenalty = result.fraud_score * 0.3;
  const newCreditScore = Math.max(0, (rep.credit_score ?? 500) - trustPenalty);
  const newFraudCount = (rep.fraud_count ?? 0) + 1;
  const newStatus: FraudStatus = result.is_blacklisted ? "BLACKLISTED" : (rep.status ?? "ACTIVE");

  await supabase
    .from("reputation")
    .update({
      fraud_score: newFraudScore,
      fraud_flags: mergedFlags,
      fraud_count: newFraudCount,
      status: newStatus,
      credit_score: Math.round(newCreditScore),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

// ─── Core: checkBlacklist ─────────────────────────────────────────────────────

/**
 * Returns true if the user is currently blacklisted.
 * Throws a descriptive error so callers can block the action.
 */
export async function checkBlacklist(userId: string): Promise<void> {
  const { data } = await supabase
    .from("reputation")
    .select("status, fraud_score, fraud_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return;

  if (data.status === "BLACKLISTED") {
    throw new Error("BLACKLISTED: Your account has been restricted due to suspicious activity.");
  }

  // Also enforce dynamically even if DB hasn't been updated yet
  if ((data.fraud_score ?? 0) > 80 || (data.fraud_count ?? 0) >= 3) {
    throw new Error("BLACKLISTED: Your account has been restricted due to suspicious activity.");
  }
}

// ─── Convenience: runFraudCheck ──────────────────────────────────────────────

/**
 * Full pipeline: detect → update → return result.
 * Call this at integration points (loan request, transaction, repayment).
 */
export async function runFraudCheck(
  userId: string,
  action: FraudAction,
  amount?: number
): Promise<FraudResult> {
  const result = await detectFraud(userId, action, amount);
  if (result.flags.length > 0) {
    await updateFraudReputation(userId, result);
  }
  return result;
}

// ─── Read: getFraudProfile ────────────────────────────────────────────────────

export async function getFraudProfile(userId: string): Promise<FraudProfile> {
  const { data } = await supabase
    .from("reputation")
    .select("fraud_score, fraud_flags, fraud_count, status")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    fraud_score: data?.fraud_score ?? 0,
    fraud_flags: Array.isArray(data?.fraud_flags) ? data.fraud_flags : [],
    fraud_count: data?.fraud_count ?? 0,
    status: (data?.status as FraudStatus) ?? "ACTIVE",
  };
}
