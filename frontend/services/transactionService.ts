import { createClient } from "@/utils/supabase/client";
import { sendTransaction } from "@/wallet/walletClient";

export type FundLoanStatus = "idle" | "pending" | "success" | "error";

export interface FundLoanResult {
  txHash: string;
}

/**
 * Funds a loan by sending a transaction from the lender's smart wallet
 * to the borrower's wallet address, then records the tx_hash in Supabase.
 *
 * For demo purposes the value sent is 0 (no real token transfer).
 * In production, integrate an ERC-20 transfer call in `data`.
 */
export async function fundLoan(
  lenderUserId: string,
  loanId: string,
  borrowerWalletAddress: string
): Promise<FundLoanResult> {
  const supabase = createClient();

  // Send on-chain transaction (gasless via paymaster)
  const result = await sendTransaction({
    userId: lenderUserId,
    to: borrowerWalletAddress,
    value: BigInt(0),
    data: "0x",
  });

  if (!result.success) {
    throw new Error("Transaction failed");
  }

  // Record tx_hash on the loan_requests table
  const { error } = await supabase
    .from("loan_requests")
    .update({ tx_hash: result.txHash })
    .eq("id", loanId);

  if (error) {
    console.error("Failed to update loan in DB:", error.message);
  }

  return { txHash: result.txHash };
}
