import { createSmartAccountClient, BiconomySmartAccountV2, PaymasterMode } from "@biconomy/account";
import { ethers } from "ethers";

const BUNDLER_URL = process.env.NEXT_PUBLIC_BICONOMY_BUNDLER_URL;
const PAYMASTER_KEY = process.env.NEXT_PUBLIC_BICONOMY_PAYMASTER_KEY;
const RPC_URL = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || "https://rpc-amoy.polygon.technology";

// Polygon Amoy chain ID
const CHAIN_ID = 80002;

// Check if wallet features are enabled
const WALLET_ENABLED = Boolean(BUNDLER_URL && PAYMASTER_KEY);

/**
 * Derives a deterministic private key from the Supabase user ID.
 * In production, use a proper key management solution (e.g. MPC or HSM).
 * For hackathon: user ID → deterministic EOA → deterministic smart account.
 */
function derivePrivateKey(userId: string): string {
  const hash = ethers.keccak256(ethers.toUtf8Bytes(`vault-wallet-${userId}`));
  return hash; // 32-byte hex string usable as a private key
}

/**
 * Creates or retrieves the ERC-4337 smart wallet for a given Supabase user ID.
 */
export async function createSmartWallet(userId: string): Promise<BiconomySmartAccountV2> {
  if (!WALLET_ENABLED) {
    throw new Error("Wallet features are disabled. Please configure BICONOMY environment variables.");
  }

  const privateKey = derivePrivateKey(userId);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);

  const smartAccount = await createSmartAccountClient({
    signer,
    bundlerUrl: BUNDLER_URL!,
    biconomyPaymasterApiKey: PAYMASTER_KEY!,
    chainId: CHAIN_ID,
  });

  return smartAccount;
}

/**
 * Returns the smart wallet address for a given user ID (deterministic, no on-chain tx needed).
 */
export async function getSmartWalletAddress(userId: string): Promise<string> {
  const smartAccount = await createSmartWallet(userId);
  return smartAccount.getAccountAddress();
}

/**
 * Fetches the MATIC balance of a wallet address.
 */
export async function getWalletBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const balance = await provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

export interface SendTransactionParams {
  userId: string;
  to: string;
  value?: bigint;
  data?: string;
}

export interface TransactionResult {
  txHash: string;
  success: boolean;
}

/**
 * Sends a gasless transaction via ERC-4337 smart account.
 * Falls back to regular gas if paymaster is unavailable.
 */
export async function sendTransaction(params: SendTransactionParams): Promise<TransactionResult> {
  const { userId, to, value = BigInt(0), data = "0x" } = params;

  const smartAccount = await createSmartWallet(userId);

  const tx = { to, data, value };

  try {
    // Attempt gasless via paymaster
    const userOpResponse = await smartAccount.sendTransaction(tx, {
      paymasterServiceData: { mode: PaymasterMode.SPONSORED },
    });
    const receipt = await userOpResponse.waitForTxHash();
    return { txHash: receipt.transactionHash ?? "", success: true };
  } catch {
    // Fallback: send without paymaster (user pays gas)
    const userOpResponse = await smartAccount.sendTransaction(tx);
    const receipt = await userOpResponse.waitForTxHash();
    return { txHash: receipt.transactionHash ?? "", success: true };
  }
}
