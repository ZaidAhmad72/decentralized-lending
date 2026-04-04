/**
 * walletService.ts
 * Wallet management + transaction simulation layer.
 * In production this becomes ethers.js calls to Base contracts.
 */

import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

export interface WalletInfo {
  address: string | null;
  balance: number; // ETH
}

export async function getWalletInfo(userId: string): Promise<WalletInfo> {
  const { data, error } = await supabase
    .from("profiles")
    .select("wallet_address, wallet_balance")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  return {
    address: data.wallet_address,
    balance: data.wallet_balance ?? 0,
  };
}

// Faucet: add test ETH
export async function addTestETH(userId: string, amount: number = 1.0): Promise<number> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("wallet_balance")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);

  const newBalance = (profile.wallet_balance ?? 0) + amount;
  await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("id", userId);
  return newBalance;
}

// Generate deterministic-looking fake tx hash
export function generateTxHash(): string {
  return "0x" + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

// Simulate on-chain tx: pending → 1-2s delay → confirmed
export async function simulateTransaction(_action: string): Promise<string> {
  const delay = 1000 + Math.random() * 1000;
  await new Promise((r) => setTimeout(r, delay));
  return generateTxHash();
}
