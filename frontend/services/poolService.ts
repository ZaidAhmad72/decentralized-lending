import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface Pool {
  id: number;
  total_liquidity: number;
  total_borrowed: number;
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

// Get pool statistics
export async function getPoolStats(): Promise<Pool> {
  const { data, error } = await supabase
    .from("pool")
    .select("*")
    .eq("id", 1)
    .single();
  
  if (error) throw new Error(error.message);
  return data;
}

// Deposit funds to pool
export async function depositToPool(userId: string, amount: number): Promise<void> {
  // Insert deposit record
  const { data: deposit, error: depositError } = await supabase
    .from("deposits")
    .insert([{ user_id: userId, amount }])
    .select()
    .single();
  
  if (depositError) throw new Error(depositError.message);

  // Increase pool total_liquidity
  const { data: pool, error: poolFetchError } = await supabase
    .from("pool")
    .select("total_liquidity")
    .eq("id", 1)
    .single();
  
  if (poolFetchError) throw new Error(poolFetchError.message);

  const { error: poolUpdateError } = await supabase
    .from("pool")
    .update({ total_liquidity: pool.total_liquidity + amount })
    .eq("id", 1);
  
  if (poolUpdateError) throw new Error(poolUpdateError.message);

  // Log transaction
  await supabase
    .from("transactions")
    .insert([{
      user_id: userId,
      type: "deposit",
      amount,
      related_loan_id: null,
    }]);
}

// Get user's deposits
export async function getUserDeposits(userId: string): Promise<Deposit[]> {
  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data ?? [];
}

// Get total deposited by user
export async function getUserTotalDeposited(userId: string): Promise<number> {
  const deposits = await getUserDeposits(userId);
  return deposits.reduce((sum, d) => sum + d.amount, 0);
}

// Transaction types
export interface Transaction {
  id: string;
  user_id: string;
  type: "deposit" | "borrow" | "repay";
  amount: number;
  related_loan_id: string | null;
  created_at: string;
}

// Get user's transaction history
export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  
  if (error) throw new Error(error.message);
  return data ?? [];
}
