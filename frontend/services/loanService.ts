import { createClient } from "@/utils/supabase/client";

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
  profiles?: { name: string; reputation_score: number };
}

// Borrow from pool
export async function borrowFromPool(
  borrowerId: string,
  amount: number,
  durationDays: number
): Promise<void> {
  // Get pool stats
  const { data: pool, error: poolError } = await supabase
    .from("pool")
    .select("*")
    .eq("id", 1)
    .single();
  
  if (poolError) throw new Error(poolError.message);

  const availableLiquidity = pool.total_liquidity - pool.total_borrowed;

  // Check if enough liquidity
  if (amount > availableLiquidity) {
    throw new Error(`Insufficient liquidity. Available: ${availableLiquidity.toFixed(2)}`);
  }

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + durationDays);

  // Insert loan
  const { data: loan, error: loanError } = await supabase
    .from("loans")
    .insert([{
      borrower_id: borrowerId,
      amount,
      duration_days: durationDays,
      interest_rate: 0.024, // 0.024% daily
      status: "active",
      due_date: dueDate.toISOString(),
    }])
    .select()
    .single();
  
  if (loanError) throw new Error(loanError.message);

  // Increase pool total_borrowed
  const { error: poolUpdateError } = await supabase
    .from("pool")
    .update({ total_borrowed: pool.total_borrowed + amount })
    .eq("id", 1);
  
  if (poolUpdateError) throw new Error(poolUpdateError.message);

  // Log transaction
  await supabase
    .from("transactions")
    .insert([{
      user_id: borrowerId,
      type: "borrow",
      amount,
      related_loan_id: loan.id,
    }]);
}

// Get user's active loan
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

// Get all user's loans
export async function getUserLoans(borrowerId: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from("loans")
    .select("*")
    .eq("borrower_id", borrowerId)
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Repay loan
export async function repayLoan(loanId: string, borrowerId: string): Promise<void> {
  // Get loan details
  const { data: loan, error: loanFetchError } = await supabase
    .from("loans")
    .select("amount")
    .eq("id", loanId)
    .eq("borrower_id", borrowerId)
    .single();
  
  if (loanFetchError) throw new Error(loanFetchError.message);

  // Update loan status
  const { error: loanUpdateError } = await supabase
    .from("loans")
    .update({ status: "repaid" })
    .eq("id", loanId);
  
  if (loanUpdateError) throw new Error(loanUpdateError.message);

  // Decrease pool total_borrowed
  const { data: pool, error: poolFetchError } = await supabase
    .from("pool")
    .select("total_borrowed")
    .eq("id", 1)
    .single();
  
  if (poolFetchError) throw new Error(poolFetchError.message);

  const { error: poolUpdateError } = await supabase
    .from("pool")
    .update({ total_borrowed: pool.total_borrowed - loan.amount })
    .eq("id", 1);
  
  if (poolUpdateError) throw new Error(poolUpdateError.message);

  // Increase borrower reputation
  const { data: profile, error: profileFetchError } = await supabase
    .from("profiles")
    .select("reputation_score")
    .eq("id", borrowerId)
    .single();
  
  if (profileFetchError) throw new Error(profileFetchError.message);

  const { error: repUpdateError } = await supabase
    .from("profiles")
    .update({ reputation_score: (profile.reputation_score ?? 0) + 10 })
    .eq("id", borrowerId);
  
  if (repUpdateError) throw new Error(repUpdateError.message);

  // Log transaction
  await supabase
    .from("transactions")
    .insert([{
      user_id: borrowerId,
      type: "repay",
      amount: loan.amount,
      related_loan_id: loanId,
    }]);
}

// Check and mark defaulted loans
export async function checkAndMarkDefaulted(borrowerId: string): Promise<void> {
  const now = new Date().toISOString();
  
  const { data: overdue, error } = await supabase
    .from("loans")
    .select("id, borrower_id, amount")
    .eq("status", "active")
    .eq("borrower_id", borrowerId)
    .lt("due_date", now);
  
  if (error || !overdue?.length) return;

  for (const loan of overdue) {
    // Mark as defaulted
    await supabase
      .from("loans")
      .update({ status: "defaulted" })
      .eq("id", loan.id);
    
    // Reduce reputation
    const { data: profile } = await supabase
      .from("profiles")
      .select("reputation_score")
      .eq("id", loan.borrower_id)
      .single();
    
    if (profile) {
      await supabase
        .from("profiles")
        .update({ reputation_score: Math.max(0, (profile.reputation_score ?? 0) - 20) })
        .eq("id", loan.borrower_id);
    }
  }
}
