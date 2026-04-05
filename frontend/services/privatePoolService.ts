/**
 * privatePoolService.ts
 * Private lending pool system with anti-abuse protection.
 */

import { createClient } from "@/utils/supabase/client";
import { simulateTransaction } from "./walletService";
import {
  runAbuseChecks,
  setCooldown,
  recordPairInteraction,
  calculatePoolTrustScore,
  type PoolTrustScore,
} from "./antiAbuseService";

export type { PoolTrustScore };

const supabase = createClient();

const DAILY_RATE = 0.005; // 0.005% per day = ~1.8% per year (friendly pool rate)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrivatePool {
  id: string;
  creator_id: string;
  pool_name: string;
  join_code: string;
  requires_approval: boolean;
  max_members: number;
  total_liquidity: number;
  total_borrowed: number;
  created_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  role: "creator" | "member";
  status: "active" | "pending" | "rejected";
  joined_at: string;
  profiles?: { name: string; email: string };
}

export interface PoolLoan {
  id: string;
  pool_id: string;
  borrower_id: string;
  amount: number;
  duration_days: number;
  interest_rate: number;
  status: "active" | "repaid" | "defaulted";
  borrowed_at: string;
  due_date: string;
  repaid_at?: string;
  borrower_name?: string;
}

export interface PoolTransaction {
  id: string;
  pool_id: string;
  user_id: string;
  type: "deposit" | "borrow" | "repay" | "withdraw";
  amount: number;
  related_loan_id?: string;
  created_at: string;
}

// ── Generate join code ────────────────────────────────────────────────────────

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ── Create pool ───────────────────────────────────────────────────────────────

export async function createPrivatePool(
  creatorId: string,
  poolName: string,
  requiresApproval: boolean = false,
  maxMembers: number = 10
): Promise<PrivatePool> {
  if (!poolName.trim()) throw new Error("Pool name is required");

  const joinCode = generateJoinCode();

  const { data: pool, error } = await supabase
    .from("private_pools")
    .insert({
      creator_id: creatorId,
      pool_name: poolName.trim(),
      join_code: joinCode,
      requires_approval: requiresApproval,
      max_members: maxMembers,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Auto-add creator as member with role 'creator'
  await supabase.from("pool_members").insert({
    pool_id: pool.id,
    user_id: creatorId,
    role: "creator",
    status: "active",
  });

  return pool;
}

// ── Join pool ─────────────────────────────────────────────────────────────────

export async function joinPrivatePool(
  userId: string,
  joinCode: string
): Promise<{ pool: PrivatePool; status: "active" | "pending" }> {
  // Find pool by join code
  const { data: pool, error: poolError } = await supabase
    .from("private_pools")
    .select("*")
    .eq("join_code", joinCode.toUpperCase().trim())
    .single();

  if (poolError || !pool) throw new Error("Invalid join code");

  // Check if already a member
  const { data: existing } = await supabase
    .from("pool_members")
    .select("status")
    .eq("pool_id", pool.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") throw new Error("You are already a member of this pool");
    if (existing.status === "pending") throw new Error("Your membership request is pending approval");
    throw new Error("Your membership was rejected");
  }

  // Check max members
  const { count } = await supabase
    .from("pool_members")
    .select("*", { count: "exact", head: true })
    .eq("pool_id", pool.id)
    .eq("status", "active");

  if ((count ?? 0) >= pool.max_members) throw new Error("Pool is full");

  const status = pool.requires_approval ? "pending" : "active";

  await supabase.from("pool_members").insert({
    pool_id: pool.id,
    user_id: userId,
    role: "member",
    status,
  });

  return { pool, status };
}

// ── Approve / reject member ───────────────────────────────────────────────────

export async function approveMember(
  creatorId: string,
  poolId: string,
  memberId: string,
  approve: boolean
): Promise<void> {
  // Verify requester is creator
  const { data: pool } = await supabase
    .from("private_pools")
    .select("creator_id")
    .eq("id", poolId)
    .single();

  if (pool?.creator_id !== creatorId) throw new Error("Only the pool creator can approve members");

  await supabase
    .from("pool_members")
    .update({ status: approve ? "active" : "rejected" })
    .eq("pool_id", poolId)
    .eq("user_id", memberId);
}

// ── Get user's pools ──────────────────────────────────────────────────────────

export async function getUserPools(userId: string): Promise<PrivatePool[]> {
  const { data, error } = await supabase
    .from("pool_members")
    .select("pool_id, private_pools(*)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.private_pools as unknown as PrivatePool);
}

// ── Get pool members ──────────────────────────────────────────────────────────

export async function getPoolMembers(poolId: string): Promise<PoolMember[]> {
  const { data, error } = await supabase
    .from("pool_members")
    .select("*, profiles(name, email)")
    .eq("pool_id", poolId)
    .order("joined_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as PoolMember[];
}

// ── Delete pool (creator only) ────────────────────────────────────────────────

export async function deletePrivatePool(
  creatorId: string,
  poolId: string
): Promise<void> {
  const { data: pool } = await supabase
    .from("private_pools")
    .select("creator_id, total_borrowed")
    .eq("id", poolId)
    .single();

  if (!pool) throw new Error("Pool not found");
  if (pool.creator_id !== creatorId) throw new Error("Only the creator can delete this pool");
  if (pool.total_borrowed > 0) throw new Error("Cannot delete pool with active loans");

  const { error } = await supabase
    .from("private_pools")
    .delete()
    .eq("id", poolId);

  if (error) throw new Error(error.message);
}

// ── Deposit to private pool ───────────────────────────────────────────────────

export async function depositToPrivatePool(
  userId: string,
  poolId: string,
  amount: number
): Promise<string> {
  if (amount <= 0) throw new Error("Amount must be greater than 0");

  // Verify membership
  const { data: member } = await supabase
    .from("pool_members")
    .select("status")
    .eq("pool_id", poolId)
    .eq("user_id", userId)
    .single();

  if (member?.status !== "active") throw new Error("You are not an active member of this pool");

  // Check wallet balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .single();

  if ((profile?.wallet_balance ?? 0) < amount) {
    throw new Error(`Insufficient balance. Available: ${(profile?.wallet_balance ?? 0).toFixed(4)} ETH`);
  }

  const txHash = await simulateTransaction("pool_deposit");

  // Deduct from wallet
  await supabase
    .from("profiles")
    .update({ wallet_balance: (profile?.wallet_balance ?? 0) - amount })
    .eq("id", userId);

  // Update pool liquidity
  const { data: pool } = await supabase
    .from("private_pools")
    .select("total_liquidity")
    .eq("id", poolId)
    .single();

  await supabase
    .from("private_pools")
    .update({ total_liquidity: (pool?.total_liquidity ?? 0) + amount })
    .eq("id", poolId);

  // Log transaction
  await supabase.from("pool_transactions").insert({
    pool_id: poolId,
    user_id: userId,
    type: "deposit",
    amount,
  });

  return txHash;
}

// ── Borrow from private pool ──────────────────────────────────────────────────

export async function borrowFromPrivatePool(
  borrowerId: string,
  poolId: string,
  amount: number,
  durationDays: number
): Promise<{ txHash: string; creditWeight: number; flags: string[] }> {
  if (amount <= 0) throw new Error("Amount must be greater than 0");
  if (durationDays <= 0) throw new Error("Duration must be greater than 0");

  // Verify membership
  const { data: member } = await supabase
    .from("pool_members")
    .select("status")
    .eq("pool_id", poolId)
    .eq("user_id", borrowerId)
    .single();

  if (member?.status !== "active") throw new Error("You are not an active member of this pool");

  // Check no existing active pool loan (ignore dust loans < 0.00001 ETH)
  const { data: existingLoan } = await supabase
    .from("pool_loans")
    .select("id, amount")
    .eq("pool_id", poolId)
    .eq("borrower_id", borrowerId)
    .eq("status", "active")
    .maybeSingle();

  if (existingLoan && existingLoan.amount >= 0.00001) {
    throw new Error("You already have an active loan in this pool");
  }

  // Auto-close any dust loans
  if (existingLoan && existingLoan.amount < 0.00001) {
    await supabase
      .from("pool_loans")
      .update({ status: "repaid", repaid_at: new Date().toISOString() })
      .eq("id", existingLoan.id);
  }

  // Get pool creator as lender
  const { data: pool } = await supabase
    .from("private_pools")
    .select("creator_id, total_liquidity, total_borrowed")
    .eq("id", poolId)
    .single();

  if (!pool) throw new Error("Pool not found");

  const available = pool.total_liquidity - pool.total_borrowed;
  if (amount > available) {
    throw new Error(`Insufficient pool liquidity. Available: ${available.toFixed(4)} ETH`);
  }

  // ── Run anti-abuse checks ──────────────────────────────────────────────────
  const abuseCheck = await runAbuseChecks({
    poolId,
    borrowerId,
    lenderId: pool.creator_id,
    amount,
    durationDays,
  });

  if (!abuseCheck.allowed) {
    throw new Error(abuseCheck.reason ?? "Borrow blocked by anti-abuse system");
  }

  const txHash = await simulateTransaction("pool_borrow");

  // Round to 8 decimal places to avoid floating point drift
  const roundedAmount = Math.round(amount * 1e8) / 1e8;

  // Create loan
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + durationDays);

  const { data: loan, error: loanError } = await supabase
    .from("pool_loans")
    .insert({
      pool_id: poolId,
      borrower_id: borrowerId,
      amount: roundedAmount,
      duration_days: durationDays,
      interest_rate: DAILY_RATE,
      status: "active",
      due_date: dueDate.toISOString(),
    })
    .select()
    .single();

  if (loanError) throw new Error(loanError.message);

  // Update pool borrowed with same rounded amount
  await supabase
    .from("private_pools")
    .update({ total_borrowed: Math.round((pool.total_borrowed + roundedAmount) * 1e8) / 1e8 })
    .eq("id", poolId);

  // Add to borrower's wallet
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", borrowerId)
    .single();

  await supabase
    .from("profiles")
    .update({ wallet_balance: Math.round(((profile?.wallet_balance ?? 0) + roundedAmount) * 1e8) / 1e8 })
    .eq("id", borrowerId);

  // Log transaction
  await supabase.from("pool_transactions").insert({
    pool_id: poolId,
    user_id: borrowerId,
    type: "borrow",
    amount: roundedAmount,
    related_loan_id: loan.id,
  });

  // Set cooldown
  await setCooldown(borrowerId, poolId);

  // Record pair interaction
  await recordPairInteraction(poolId, pool.creator_id, borrowerId);

  // Apply credit score impact (with weight)
  if (abuseCheck.creditWeight > 0) {
    await applyWeightedCreditImpact(borrowerId, "borrow", abuseCheck.creditWeight);
  }

  return { txHash, creditWeight: abuseCheck.creditWeight, flags: abuseCheck.flags };
}

// ── Repay private pool loan ───────────────────────────────────────────────────

export async function repayPrivatePoolLoan(
  borrowerId: string,
  loanId: string,
  customAmount?: number  // optional partial repay in ETH
): Promise<{ txHash: string; creditWeight: number }> {
  const { data: loan, error: loanError } = await supabase
    .from("pool_loans")
    .select("*")
    .eq("id", loanId)
    .eq("borrower_id", borrowerId)
    .single();

  if (loanError || !loan) throw new Error("Loan not found");
  if (loan.status !== "active") throw new Error("Loan is not active");

  const interest = loan.amount * (loan.interest_rate / 100) * loan.duration_days;
  const totalRepayment = loan.amount + interest;

  // Clamp to totalRepayment to handle floating point overage
  const repayAmount = Math.min(customAmount ?? totalRepayment, totalRepayment);
  if (repayAmount <= 0) throw new Error("Repay amount must be greater than 0");

  // Treat as full repay if: paying full amount, dust loan, or tiny remainder
  const isFullRepay = Math.abs(repayAmount - totalRepayment) < 0.000001 || loan.amount < 0.00001;

  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", borrowerId)
    .single();

  if ((profile?.wallet_balance ?? 0) < repayAmount) {
    throw new Error(`Insufficient balance. Need: ${repayAmount.toFixed(6)} ETH, Have: ${(profile?.wallet_balance ?? 0).toFixed(6)} ETH`);
  }

  const onTime = new Date() <= new Date(loan.due_date);
  const txHash = await simulateTransaction("pool_repay");

  // Deduct from wallet
  await supabase
    .from("profiles")
    .update({ wallet_balance: Math.max(0, (profile?.wallet_balance ?? 0) - repayAmount) })
    .eq("id", borrowerId);

  const { data: pool } = await supabase
    .from("private_pools")
    .select("total_borrowed")
    .eq("id", loan.pool_id)
    .single();

  if (isFullRepay) {
    await supabase
      .from("pool_loans")
      .update({ status: "repaid", repaid_at: new Date().toISOString() })
      .eq("id", loanId);
    await supabase
      .from("private_pools")
      .update({ total_borrowed: Math.max(0, (pool?.total_borrowed ?? 0) - loan.amount) })
      .eq("id", loan.pool_id);
  } else {
    const principalPaid = repayAmount * (loan.amount / totalRepayment);
    const remaining = Math.max(0, loan.amount - principalPaid);
    if (remaining < 0.00001) {
      // Dust remainder — close the loan
      await supabase
        .from("pool_loans")
        .update({ status: "repaid", repaid_at: new Date().toISOString() })
        .eq("id", loanId);
      await supabase
        .from("private_pools")
        .update({ total_borrowed: Math.max(0, (pool?.total_borrowed ?? 0) - loan.amount) })
        .eq("id", loan.pool_id);
    } else {
      await supabase
        .from("pool_loans")
        .update({ amount: Math.round(remaining * 1e8) / 1e8 })
        .eq("id", loanId);
      await supabase
        .from("private_pools")
        .update({ total_borrowed: Math.max(0, Math.round(((pool?.total_borrowed ?? 0) - principalPaid) * 1e8) / 1e8) })
        .eq("id", loan.pool_id);
    }
  }

  await supabase.from("pool_transactions").insert({
    pool_id: loan.pool_id,
    user_id: borrowerId,
    type: "repay",
    amount: repayAmount,
    related_loan_id: loanId,
  });

  const creditWeight = isFullRepay ? 0.10 : 0.05;
  await applyWeightedCreditImpact(borrowerId, onTime ? "repay_ontime" : "repay_late", creditWeight);

  return { txHash, creditWeight };
}

// ── Weighted credit impact ────────────────────────────────────────────────────

/**
 * Apply a weighted credit score change.
 * Private pool activity uses 10% of normal impact.
 */
async function applyWeightedCreditImpact(
  userId: string,
  event: "borrow" | "repay_ontime" | "repay_late" | "default",
  weight: number
): Promise<void> {
  const { data: rep } = await supabase
    .from("reputation")
    .select("credit_score")
    .eq("user_id", userId)
    .single();

  if (!rep) return;

  // Normal deltas (same as public pool)
  const normalDeltas: Record<string, number> = {
    borrow: 0,
    repay_ontime: 20,
    repay_late: 5,
    default: -75,
  };

  const normalDelta = normalDeltas[event] ?? 0;
  const weightedDelta = Math.round(normalDelta * weight);

  if (weightedDelta === 0) return;

  const newScore = Math.max(300, Math.min(1000, rep.credit_score + weightedDelta));

  await supabase
    .from("reputation")
    .update({ credit_score: newScore, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPoolLoans(poolId: string): Promise<PoolLoan[]> {
  const { data, error } = await supabase
    .from("pool_loans")
    .select("*, profiles(name)")
    .eq("pool_id", poolId)
    .order("borrowed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({
    ...l,
    borrower_name: (l.profiles as { name: string } | null)?.name ?? "Unknown",
  }));
}

export async function getPoolTransactions(poolId: string): Promise<PoolTransaction[]> {
  const { data, error } = await supabase
    .from("pool_transactions")
    .select("*")
    .eq("pool_id", poolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUserActivePoolLoan(
  userId: string,
  poolId: string
): Promise<PoolLoan | null> {
  const { data } = await supabase
    .from("pool_loans")
    .select("*")
    .eq("pool_id", poolId)
    .eq("borrower_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return data ?? null;
}

// ── Get ALL active private pool loans for a user (with pool name + borrower name) ──

export interface PoolLoanWithMeta extends PoolLoan {
  pool_name: string;
  borrower_name: string;
}

export async function getUserAllActivePoolLoans(userId: string): Promise<PoolLoanWithMeta[]> {
  const { data, error } = await supabase
    .from("pool_loans")
    .select("*, private_pools(pool_name), profiles(name)")
    .eq("borrower_id", userId)
    .eq("status", "active")
    .order("borrowed_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((l) => ({
    ...l,
    pool_name: (l.private_pools as { pool_name: string } | null)?.pool_name ?? "Private Pool",
    borrower_name: (l.profiles as { name: string } | null)?.name ?? "Unknown",
  })).filter((l) => l.amount >= 0.00001); // filter out dust loans
}

// ── Get pool loans with borrower names (for creator view) ─────────────────────

export interface PoolLoanWithBorrower extends PoolLoan {
  borrower_name: string;
}

export async function getPoolLoansWithBorrowers(poolId: string): Promise<PoolLoanWithBorrower[]> {
  const { data, error } = await supabase
    .from("pool_loans")
    .select("*, profiles(name)")
    .eq("pool_id", poolId)
    .order("borrowed_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((l) => ({
    ...l,
    borrower_name: (l.profiles as { name: string } | null)?.name ?? "Unknown",
  }));
}

export async function getPoolWithTrustScore(
  poolId: string
): Promise<{ pool: PrivatePool; trustScore: PoolTrustScore }> {
  const { data: pool, error } = await supabase
    .from("private_pools")
    .select("*")
    .eq("id", poolId)
    .single();

  if (error) throw new Error(error.message);

  const trustScore = await calculatePoolTrustScore(poolId);
  return { pool, trustScore };
}

// ── Pool analytics ────────────────────────────────────────────────────────────

export interface PoolAnalytics {
  totalDeposited: number;
  totalBorrowed: number;
  activeLoans: number;
  repaymentRate: number;
  topBorrowers: { borrower_id: string; total: number }[];
  memberCount: number;
}

export async function getPoolAnalytics(poolId: string): Promise<PoolAnalytics> {
  const [loansRes, membersRes, poolRes] = await Promise.all([
    supabase.from("pool_loans").select("borrower_id, amount, status").eq("pool_id", poolId),
    supabase.from("pool_members").select("*", { count: "exact", head: true }).eq("pool_id", poolId).eq("status", "active"),
    supabase.from("private_pools").select("total_liquidity, total_borrowed").eq("id", poolId).single(),
  ]);

  const loans = loansRes.data ?? [];
  const repaid = loans.filter((l) => l.status === "repaid").length;
  const active = loans.filter((l) => l.status === "active").length;

  // Top borrowers
  const borrowerTotals: Record<string, number> = {};
  loans.forEach((l) => {
    borrowerTotals[l.borrower_id] = (borrowerTotals[l.borrower_id] ?? 0) + l.amount;
  });
  const topBorrowers = Object.entries(borrowerTotals)
    .map(([borrower_id, total]) => ({ borrower_id, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    totalDeposited: poolRes.data?.total_liquidity ?? 0,
    totalBorrowed: poolRes.data?.total_borrowed ?? 0,
    activeLoans: active,
    repaymentRate: loans.length > 0 ? repaid / loans.length : 0,
    topBorrowers,
    memberCount: membersRes.count ?? 0,
  };
}
