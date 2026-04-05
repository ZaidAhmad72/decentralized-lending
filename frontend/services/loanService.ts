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
  amount: number,       // in ETH (converted from INR in UI)
  durationDays: number
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
  await supabase.from("transactions").insert([{
    user_id: borrowerId,
    type: "borrow",
    amount,
    related_loan_id: loan.id,
    tx_hash: txHash,
  }]);

  return txHash;
}

// ─── REPAY (maps to LoanManager.repayLoan()) ─────────────────────────────────
export async function repayLoan(
  loanId: string,
  borrowerId: string,
  customAmount?: number  // optional partial repay in ETH; defaults to full amount
): Promise<string> {
  const { data: loan, error: loanFetchError } = await supabase
    .from("loans")
    .select("amount, interest_rate, duration_days, due_date, status")
    .eq("id", loanId)
    .eq("borrower_id", borrowerId)
    .single();
  if (loanFetchError) throw new Error(loanFetchError.message);
  if (loan.status !== "active") throw new Error("Loan is not active.");

  const interest = loan.amount * (loan.interest_rate / 100) * loan.duration_days;
  const totalRepayment = loan.amount + interest;

  // Use custom amount if provided, otherwise full repayment
  const repayAmount = customAmount ?? totalRepayment;
  if (repayAmount <= 0) throw new Error("Repay amount must be greater than 0");
  if (repayAmount > totalRepayment) throw new Error(`Cannot repay more than total due: ${totalRepayment.toFixed(6)} ETH`);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", borrowerId)
    .single();
  if (profileError) throw new Error(profileError.message);

  if (profile.wallet_balance < repayAmount) {
    throw new Error(
      `Insufficient wallet balance. Need: ${repayAmount.toFixed(6)} ETH, Have: ${profile.wallet_balance.toFixed(6)} ETH`
    );
  }

  const onTime = new Date() <= new Date(loan.due_date);
  const isFullRepay = Math.abs(repayAmount - totalRepayment) < 0.000001;
  const txHash = await simulateTransaction("repay");

  // Deduct from wallet
  await supabase
    .from("profiles")
    .update({ wallet_balance: profile.wallet_balance - repayAmount })
    .eq("id", borrowerId);

  // Only mark fully repaid if paying full amount
  if (isFullRepay) {
    await supabase
      .from("loans")
      .update({ status: "repaid", repaid_at: new Date().toISOString() })
      .eq("id", loanId);
    await poolRepay(loan.amount);
    await recordRepayment(borrowerId, onTime);
    await recalculateCreditScore(borrowerId);
  } else {
    // Partial repay — reduce the loan amount
    const remaining = totalRepayment - repayAmount;
    // Proportionally reduce principal (approximate)
    const principalPaid = repayAmount * (loan.amount / totalRepayment);
    await supabase
      .from("loans")
      .update({ amount: Math.max(0, loan.amount - principalPaid) })
      .eq("id", loanId);
    await poolRepay(principalPaid);
  }

  await supabase.from("transactions").insert([{
    user_id: borrowerId,
    type: "repay",
    amount: repayAmount,
    related_loan_id: loanId,
    tx_hash: txHash,
  }]);

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

    // Pool: release the borrow (loan is lost, liquidity absorbs loss)
    await poolRepay(loan.amount);

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
