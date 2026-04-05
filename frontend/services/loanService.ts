/**
 * loanService.ts
 * Maps to: LoanManager.sol
 *
 * Calls:
 *   LendingPool.borrow() / LendingPool.repay()
 *   Reputation.recordLoan() / recordRepayment() / recordDefault()
 */

import { createClient } from "@/utils/supabase/client";
import { poolBorrow, poolRepay } from "./poolService";
import { recordLoan, recordRepayment, recordDefault, getReputation, getMaxLTV, recalculateCreditScore } from "./reputationService";
import { simulateTransaction } from "./walletService";

const supabase = createClient();

export type LoanStatus = "active" | "repaid" | "defaulted";

export interface Loan {
  id: string;
  borrower_id: string;
  amount: number;
  duration_days: number;
  interest_rate: number;
  status: LoanStatus;
  created_at: string;
  due_date: string;
}

const DAILY_RATE = 0.024; // 0.024% per day

// ─── BORROW (maps to LoanManager.createLoan()) ───────────────────────────────
export async function borrowFromPool(
  borrowerId: string,
  amount: number,
  durationDays: number,
  currency: string = 'ETH',
  originalAmount?: number
): Promise<string> {
  if (amount <= 0) throw new Error("Amount must be greater than 0");
  if (durationDays <= 0) throw new Error("Duration must be greater than 0");

  // 1. Check no existing active loan
  const existing = await getUserActiveLoan(borrowerId);
  if (existing) throw new Error("You already have an active loan. Repay it first.");

  // 2. Fetch credit score → determine maxLTV
  const rep = await getReputation(borrowerId);
  const maxLTV = getMaxLTV(rep.credit_score);

  // 3. Validate borrow amount against LTV
  // maxBorrow = totalLiquidity * maxLTV (simplified — no collateral in this version)
  // We enforce: borrow <= available * maxLTV
  const { data: pool } = await supabase.from("pool").select("*").eq("id", 1).single();
  const available = pool.total_liquidity - pool.total_borrowed;
  const maxBorrow = available * maxLTV;

  if (amount > maxBorrow) {
    throw new Error(
      `Borrow exceeds your credit limit. Max: ${maxBorrow.toFixed(6)} ETH (LTV ${(maxLTV * 100).toFixed(0)}% for score ${rep.credit_score})`
    );
  }

  // 4. Simulate tx
  const txHash = await simulateTransaction("borrow");

  // 5. Call pool borrow (increases totalBorrowed)
  await poolBorrow(amount);

  // 6. Add borrowed ETH to borrower's wallet
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", borrowerId)
    .single();
  if (profileError) throw new Error(profileError.message);

  await supabase
    .from("profiles")
    .update({ wallet_balance: (profile.wallet_balance ?? 0) + amount })
    .eq("id", borrowerId);

  // 7. Create loan record
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + durationDays);

  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert([{
      borrower_id: borrowerId,
      amount,
      duration_days: durationDays,
      interest_rate: DAILY_RATE,
      status: "active",
      due_date: dueDate.toISOString(),
    }])
    .select()
    .single();
  if (loanError) throw new Error(loanError.message);

  // 8. Update reputation: recordLoan()
  await recordLoan(borrowerId, amount);

  // 8.1. Recalculate credit score
  await recalculateCreditScore(borrowerId);

  // 9. Log transaction
  const { error: txError } = await supabase.from("transactions").insert([{
    user_id: borrowerId,
    type: "borrow",
    currency: currency,
    amount_original: originalAmount ?? amount,
    amount_eth: amount,
    amount: amount,
    related_loan_id: loan.id,
    tx_hash: txHash,
  }]);
  if (txError) console.error("Transaction log failed:", txError.message);

  return txHash;
}

// ─── REPAY (maps to LoanManager.repayLoan()) ─────────────────────────────────
export async function repayLoan(loanId: string, borrowerId: string): Promise<string> {
  // 1. Fetch loan
  const { data: loan, error: loanFetchError } = await supabase
    .from("loans")
    .select("amount, interest_rate, duration_days, due_date, status")
    .eq("id", loanId)
    .eq("borrower_id", borrowerId)
    .single();
  if (loanFetchError) throw new Error(loanFetchError.message);
  if (loan.status !== "active") throw new Error("Loan is not active.");

  // 2. Calculate repayment = principal + interest
  const interest = loan.amount * (loan.interest_rate / 100) * loan.duration_days;
  const totalRepayment = loan.amount + interest;

  // 3. Check wallet balance
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", borrowerId)
    .single();
  if (profileError) throw new Error(profileError.message);

  if (profile.wallet_balance < totalRepayment) {
    throw new Error(
      `Insufficient wallet balance. Need: ${totalRepayment.toFixed(6)} ETH, Have: ${profile.wallet_balance.toFixed(6)} ETH`
    );
  }

  // 4. Determine if on-time
  const onTime = new Date() <= new Date(loan.due_date);

  // 5. Simulate tx
  const txHash = await simulateTransaction("repay");

  // 6. Deduct from wallet
  await supabase
    .from("profiles")
    .update({ wallet_balance: profile.wallet_balance - totalRepayment })
    .eq("id", borrowerId);

  // 7. Mark loan repaid
  const { error: loanUpdateError } = await supabase
    .from("loans")
    .update({ 
      status: "repaid",
      repaid_at: new Date().toISOString(),
    })
    .eq("id", loanId);
  if (loanUpdateError) throw new Error(loanUpdateError.message);

  // 8. Call pool repay (decreases totalBorrowed, adds interest to totalLiquidity)
  await poolRepay(loan.amount, interest);

  // 9. Update reputation: recordRepayment()
  await recordRepayment(borrowerId, onTime);

  // 9.1. Recalculate credit score
  await recalculateCreditScore(borrowerId);

  // 10. Log transaction
  const { error: txError } = await supabase.from("transactions").insert([{
    user_id: borrowerId,
    type: "repay",
    currency: 'ETH',
    amount_original: loan.amount,
    amount_eth: loan.amount,
    amount: loan.amount,
    related_loan_id: loanId,
    tx_hash: txHash,
  }]);
  if (txError) console.error("Transaction log failed:", txError.message);

  return txHash;
}

// ─── LIQUIDATE (maps to LoanManager.liquidate()) ─────────────────────────────
export async function checkAndMarkDefaulted(borrowerId: string): Promise<void> {
  const now = new Date().toISOString();

  const { data: overdue } = await supabase
    .from("loans")
    .select("id, amount")
    .eq("status", "active")
    .eq("borrower_id", borrowerId)
    .lt("due_date", now);

  if (!overdue?.length) return;

  for (const loan of overdue) {
    // Mark defaulted
    await supabase.from("loans").update({ status: "defaulted" }).eq("id", loan.id);

    // Pool: release the borrow (loan is lost, no interest earned on default)
    await poolRepay(loan.amount, 0);

    // Reputation: recordDefault() — score -= 75
    await recordDefault(borrowerId);

    // Recalculate credit score
    await recalculateCreditScore(borrowerId);
  }
}

// ─── QUERIES ─────────────────────────────────────────────────────────────────

export async function getUserActiveLoan(borrowerId: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("borrower_id", borrowerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserLoans(borrowerId: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("borrower_id", borrowerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
