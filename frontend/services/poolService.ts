/**
 * poolService.ts
 * Maps to: LendingPool.sol
 *
 * RULES:
 *   - totalLiquidity NEVER changes on borrow/repay
 *   - totalBorrowed tracks active borrows only
 *   - Shares use ERC-4626 style: shares = amount * totalShares / totalLiquidity
 */

import { createClient } from "@/utils/supabase/client";
import { simulateTransaction } from "./walletService";
import { recalculateCreditScore } from "./reputationService";

const supabase = createClient();

export interface Pool {
  id: number;
  total_liquidity: number;
  total_borrowed: number;
  total_shares: number;
}

export interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  shares_minted: number;
  created_at: string;
}

// ─── READ ────────────────────────────────────────────────────────────────────

export async function getPoolStats(): Promise<Pool> {
  const { data, error } = await supabase
    .from("pool")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getUserShares(userId: string): Promise<number> {
  const { data } = await supabase
    .from("user_shares")
    .select("shares")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.shares ?? 0;
}

// Convert user shares → INR value
export async function getUserShareValue(userId: string): Promise<number> {
  const pool = await getPoolStats();
  const shares = await getUserShares(userId);
  if (pool.total_shares === 0 || shares === 0) return 0;
  return (shares * pool.total_liquidity) / pool.total_shares;
}

export async function getUserDeposits(userId: string): Promise<Deposit[]> {
  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getUserTotalDeposited(userId: string): Promise<number> {
  const deposits = await getUserDeposits(userId);
  return deposits.reduce((sum, d) => sum + d.amount, 0);
}

// ─── DEPOSIT (maps to LendingPool.deposit()) ─────────────────────────────────
// amount is in ETH (stored), INR conversion happens in UI layer
export async function depositToPool(userId: string, amount: number, currency: string = 'ETH', originalAmount?: number): Promise<string> {
  if (amount <= 0) throw new Error("Amount must be greater than 0");

  // 1. Check wallet balance
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .single();
  if (profileError) throw new Error(profileError.message);
  if (profile.wallet_balance < amount) {
    throw new Error(`Insufficient wallet balance. Available: ${profile.wallet_balance.toFixed(6)} ETH`);
  }

  // 2. Fetch pool state
  const pool = await getPoolStats();

  // 3. Calculate shares to mint (ERC-4626 style)
  // IF first deposit: shares = amount
  // ELSE: shares = (amount * totalShares) / totalLiquidity
  const sharesToMint =
    pool.total_shares === 0 || pool.total_liquidity === 0
      ? amount
      : (amount * pool.total_shares) / pool.total_liquidity;

  // 4. Simulate tx
  const txHash = await simulateTransaction("deposit");

  // 5. Deduct from wallet
  const { error: walletError } = await supabase
    .from("profiles")
    .update({ wallet_balance: profile.wallet_balance - amount })
    .eq("id", userId);
  if (walletError) throw new Error(walletError.message);

  // 6. Insert deposit record
  const { error: depositError } = await supabase
    .from("deposits")
    .insert([{ user_id: userId, amount, shares_minted: sharesToMint }]);
  if (depositError) {
    await supabase.from("profiles").update({ wallet_balance: profile.wallet_balance }).eq("id", userId);
    throw new Error(depositError.message);
  }

  // 7. Update pool: totalLiquidity += amount, totalShares += sharesToMint
  const { error: poolError } = await supabase
    .from("pool")
    .update({
      total_liquidity: pool.total_liquidity + amount,
      total_shares: pool.total_shares + sharesToMint,
    })
    .eq("id", 1);
  if (poolError) throw new Error(poolError.message);

  // 8. Upsert user_shares
  const currentShares = await getUserShares(userId);
  if (currentShares === 0) {
    await supabase.from("user_shares").insert([{ user_id: userId, shares: sharesToMint }]);
  } else {
    await supabase
      .from("user_shares")
      .update({ shares: currentShares + sharesToMint, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
  }

  // 9. Log transaction
  const { error: txError } = await supabase.from("transactions").insert([{
    user_id: userId,
    type: "deposit",
    currency: currency,
    amount_original: originalAmount ?? amount,
    amount_eth: amount,
    amount: amount,
    tx_hash: txHash,
  }]);
  if (txError) console.error("Transaction log failed:", txError.message);

  // 10. Recalculate credit score
  await recalculateCreditScore(userId);

  return txHash;
}

// ─── WITHDRAW (maps to LendingPool.withdraw()) ───────────────────────────────
export async function withdrawFromPool(userId: string, sharesToBurn: number): Promise<{ amount: number; txHash: string }> {
  if (sharesToBurn <= 0) throw new Error("Shares must be greater than 0");

  const pool = await getPoolStats();
  const userShares = await getUserShares(userId);

  if (sharesToBurn > userShares) throw new Error("Insufficient shares");

  // amount = (shares * totalLiquidity) / totalShares
  const amount = (sharesToBurn * pool.total_liquidity) / pool.total_shares;
  const available = pool.total_liquidity - pool.total_borrowed;

  if (amount > available) {
    throw new Error(`Insufficient available liquidity. Available: ${available.toFixed(6)} ETH`);
  }

  const txHash = await simulateTransaction("withdraw");

  // Update pool
  await supabase
    .from("pool")
    .update({
      total_liquidity: pool.total_liquidity - amount,
      total_shares: pool.total_shares - sharesToBurn,
    })
    .eq("id", 1);

  // Update user shares
  await supabase
    .from("user_shares")
    .update({ shares: userShares - sharesToBurn, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // Return ETH to wallet
  const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("id", userId).single();
  await supabase.from("profiles").update({ wallet_balance: (profile?.wallet_balance ?? 0) + amount }).eq("id", userId);

  await supabase.from("transactions").insert([{
    user_id: userId,
    type: "withdraw",
    amount,
    tx_hash: txHash,
  }]);

  return { amount, txHash };
}

// ─── INTERNAL: called by LoanManager ─────────────────────────────────────────

// borrow() — increases totalBorrowed only (totalLiquidity unchanged)
export async function poolBorrow(amount: number): Promise<void> {
  const pool = await getPoolStats();
  const available = pool.total_liquidity - pool.total_borrowed;
  if (amount > available) throw new Error(`Insufficient pool liquidity. Available: ${available.toFixed(6)} ETH`);

  const { error } = await supabase
    .from("pool")
    .update({ total_borrowed: pool.total_borrowed + amount })
    .eq("id", 1);
  if (error) throw new Error(error.message);
}

// repay() — decreases totalBorrowed, adds interest to totalLiquidity (distributed to depositors)
export async function poolRepay(principal: number, interest: number = 0): Promise<void> {
  const pool = await getPoolStats();
  const { error } = await supabase
    .from("pool")
    .update({ 
      total_borrowed: Math.max(0, pool.total_borrowed - principal),
      total_liquidity: pool.total_liquidity + interest, // interest grows the pool → depositors earn yield
    })
    .eq("id", 1);
  if (error) throw new Error(error.message);
}

// Transaction history
export interface Transaction {
  id: string;
  user_id: string;
  type: "deposit" | "borrow" | "repay" | "withdraw";
  currency: string;           // original currency (ETH, BTC, USDC, etc.)
  amount_original: number;    // what user entered
  amount_eth: number;         // ETH equivalent (used for all calculations)
  amount: number;             // legacy field (keep for backward compat)
  related_loan_id: string | null;
  tx_hash: string | null;
  created_at: string;
}

export async function getUserTransactions(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
