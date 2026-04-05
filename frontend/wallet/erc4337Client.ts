/**
 * erc4337Client.ts
 * ERC-4337 Account Abstraction wallet using:
 *   - permissionless (smart account SDK)
 *   - viem (transport layer)
 *   - Pimlico (free bundler + paymaster — gasless txs)
 *   - Polygon Amoy testnet
 *
 * Strategy: deterministic SimpleAccount derived from userId.
 * Same userId → same EOA owner → same smart account address, every time.
 */

import { createPublicClient, http, formatEther, parseEther, isAddress } from "viem";
import { polygonAmoy } from "viem/chains";
import { createSmartAccountClient } from "permissionless";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { ethers } from "ethers";
import { entryPoint07Address } from "viem/account-abstraction";

// ── Config ────────────────────────────────────────────────────────────────

const RPC_URL =
  process.env.NEXT_PUBLIC_POLYGON_RPC_URL ?? "https://rpc-amoy.polygon.technology";

const PIMLICO_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY ?? "";

const PIMLICO_URL = PIMLICO_KEY
  ? `https://api.pimlico.io/v2/polygon-amoy/rpc?apikey=${PIMLICO_KEY}`
  : "https://api.pimlico.io/v2/polygon-amoy/rpc?apikey=public"; // public fallback

// ── Public client (read-only) ─────────────────────────────────────────────

export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http(RPC_URL),
});

// ── Pimlico bundler + paymaster client ────────────────────────────────────

export const pimlicoClient = createPimlicoClient({
  transport: http(PIMLICO_URL),
  entryPoint: {
    address: entryPoint07Address,
    version: "0.7",
  },
});

// ── Derive EOA owner from userId ──────────────────────────────────────────

/**
 * Derives a deterministic private key from a Supabase userId.
 * NEVER expose this in the UI or logs.
 */
function deriveOwnerPrivateKey(userId: string): `0x${string}` {
  const hash = ethers.keccak256(ethers.toUtf8Bytes("vault-erc4337-" + userId));
  return hash as `0x${string}`;
}

// ── Smart account ─────────────────────────────────────────────────────────

export interface SmartAccountResult {
  smartAccountClient: ReturnType<typeof createSmartAccountClient>;
  address: `0x${string}`;
}

/**
 * Creates (or loads) the ERC-4337 SimpleAccount for a given userId.
 * The smart account address is deterministic — same userId = same address.
 */
export async function getSmartAccount(userId: string): Promise<SmartAccountResult> {
  const { privateKeyToAccount } = await import("viem/accounts");
  const pk = deriveOwnerPrivateKey(userId);
  const owner = privateKeyToAccount(pk);

  const account = await toSimpleSmartAccount({
    client: publicClient,
    owner,
    entryPoint: {
      address: entryPoint07Address,
      version: "0.7",
    },
  });

  const smartAccountClient = createSmartAccountClient({
    account,
    chain: polygonAmoy,
    bundlerTransport: http(PIMLICO_URL),
    paymaster: pimlicoClient,
    userOperation: {
      estimateFeesPerGas: async () => {
        return (await pimlicoClient.getUserOperationGasPrice()).fast;
      },
    },
  });

  return {
    smartAccountClient,
    address: account.address,
  };
}

// ── Balance ───────────────────────────────────────────────────────────────

/**
 * Returns the MATIC balance of a smart account address.
 * Returns "0.0000" on network errors.
 */
export async function getSmartAccountBalance(address: `0x${string}`): Promise<string> {
  try {
    const balance = await publicClient.getBalance({ address });
    return parseFloat(formatEther(balance)).toFixed(4);
  } catch {
    return "0.0000";
  }
}

// ── Send transaction (gasless via Pimlico paymaster) ──────────────────────

export interface SendTxParams {
  userId: string;
  to: string;
  amountMatic: string;
}

export interface TxResult {
  txHash: string;
  explorerUrl: string;
}

/**
 * Sends a gasless UserOperation via ERC-4337.
 * Gas is sponsored by Pimlico paymaster — user pays nothing.
 */
export async function sendSmartAccountTransaction(params: SendTxParams): Promise<TxResult> {
  const { userId, to, amountMatic } = params;

  if (!isAddress(to)) throw new Error("Invalid recipient address");

  const value = parseEther(amountMatic);
  const { smartAccountClient } = await getSmartAccount(userId);

  const txHash = await smartAccountClient.sendTransaction({
    to: to as `0x${string}`,
    value,
    data: "0x",
  });

  return {
    txHash,
    explorerUrl: "https://amoy.polygonscan.com/tx/" + txHash,
  };
}
