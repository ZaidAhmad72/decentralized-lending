import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export type LoanStatus = "pending" | "funded" | "repaid" | "defaulted";

export interface LoanRequest {
  id: string;
  borrower_id: string;
  lender_id: string | null;
  amount: number;
  purpose: string;
  duration_days: number;
  interest_rate: number;
  status: LoanStatus;
  created_at: string;
  funded_at: string | null;
  due_date: string | null;
  profiles?: { name: string; reputation_score: number; wallet_address?: string };
}

// Create a new loan request
export async function createLoanRequest(
  borrowerId: string,
  amount: number,
  purpose: string,
  durationDays: number
) {
  const { data, error } = await supabase
    .from("loan_requests")
    .insert([{
      borrower_id: borrowerId,
      amount,
      purpose,
      duration_days: durationDays,
      interest_rate: 0,
      status: "pending",
    }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// Fetch all pending loans for marketplace (exclude current user's own loans)
export async function fetchPendingLoans(currentUserId: string): Promise<LoanRequest[]> {
  const { data, error } = await supabase
    .from("loan_requests")
    .select("*, profiles!loan_requests_borrower_id_fkey(name, reputation_score, wallet_address)")
    .eq("status", "pending")
    .neq("borrower_id", currentUserId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Fund a loan
export async function fundLoan(loanId: string, lenderId: string, interestRate: number) {
  const now = new Date();
  const { data: loan, error: fetchError } = await supabase
    .from("loan_requests")
    .select("duration_days")
    .eq("id", loanId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + loan.duration_days);

  const { error } = await supabase
    .from("loan_requests")
    .update({
      status: "funded",
      lender_id: lenderId,
      interest_rate: interestRate,
      funded_at: now.toISOString(),
      due_date: dueDate.toISOString(),
    })
    .eq("id", loanId);
  if (error) throw new Error(error.message);
}

// Fetch active loan for borrower (status = funded)
export async function fetchActiveLoan(borrowerId: string): Promise<LoanRequest | null> {
  const { data, error } = await supabase
    .from("loan_requests")
    .select("*")
    .eq("borrower_id", borrowerId)
    .eq("status", "funded")
    .order("funded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Repay a loan + boost reputation by +10
export async function repayLoan(loanId: string, borrowerId: string) {
  const { error: loanError } = await supabase
    .from("loan_requests")
    .update({ status: "repaid" })
    .eq("id", loanId);
  if (loanError) throw new Error(loanError.message);

  const { data: profile, error: profileFetchError } = await supabase
    .from("profiles")
    .select("reputation_score")
    .eq("id", borrowerId)
    .single();
  if (profileFetchError) throw new Error(profileFetchError.message);

  const { error: repError } = await supabase
    .from("profiles")
    .update({ reputation_score: (profile.reputation_score ?? 0) + 10 })
    .eq("id", borrowerId);
  if (repError) throw new Error(repError.message);
}

// Mark overdue loans as defaulted and reduce reputation by -20
export async function checkAndMarkDefaulted(borrowerId: string) {
  const now = new Date().toISOString();
  const { data: overdue, error } = await supabase
    .from("loan_requests")
    .select("id, borrower_id")
    .eq("status", "funded")
    .eq("borrower_id", borrowerId)
    .lt("due_date", now);
  if (error || !overdue?.length) return;

  for (const loan of overdue) {
    await supabase.from("loan_requests").update({ status: "defaulted" }).eq("id", loan.id);
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
