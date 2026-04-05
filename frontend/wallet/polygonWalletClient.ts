/**
 * polygonWalletClient.ts
 * Polygon wallet system using ethers v6.
 *
 * Strategy: Option A — deterministic custodial wallet derived from userId.
 * Reason: No MetaMask dependency, works server-side, seamless UX, same
 * address every time for the same user, no key management UI needed.
 *
 * Security: private key is derived server-side and NEVER sent to the client.
 * The client only ever sees the wallet address and balance.
 */

import { ethers } from "ethers";
import { ACTIVE_NETWORK } from "./polygonConfig";

// ── Provider ──────────────────────────────────────────────────────────────

let _provider: ethers.JsonRpcProvider | null = null;

/** Returns a cached Polygon JSON-RPC provider. */
export function getPolygonProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(ACTIVE_NETWORK.rpcUrl, {
      chainId: ACTIVE_NETWORK.chainId,
      name: ACTIVE_NETWORK.name,
    });
  }
  return _provider;
}

// ── Deterministic wallet derivation ──────────────────────────────────────

/**
 * Derives a deterministic private key from a Supabase userId.
 * The same userId always produces the same key → same address.
 * NEVER expose this key in the UI or logs.
 */
function derivePrivateKey(userId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes("polygon-vault-" + userId));
}

/**
 * Returns a connected ethers.Wallet for the given userId.
 * The wallet is connected to the Polygon provider.
 */
export function getPolygonWallet(userId: string): ethers.Wallet {
  const pk = derivePrivateKey(userId);
  return new ethers.Wallet(pk, getPolygonProvider());
}

// ── Address ───────────────────────────────────────────────────────────────

/**
 * Returns the Polygon wallet address for a given userId.
 * Deterministic — no async needed.
 */
export function getPolygonAddress(userId: string): string {
  return getPolygonWallet(userId).address;
}

// ── Balance ───────────────────────────────────────────────────────────────

export interface PolygonBalance {
  matic: string;   // formatted, e.g. "1.2345"
  wei: bigint;
}

/**
 * Fetches the MATIC balance for a given address.
 * Returns "0.0000" gracefully on network errors.
 */
export async function getPolygonBalance(address: string): Promise<PolygonBalance> {
  try {
    const provider = getPolygonProvider();
    const wei = await provider.getBalance(address);
    return {
      matic: parseFloat(ethers.formatEther(wei)).toFixed(4),
      wei,
    };
  } catch {
    return { matic: "0.0000", wei: BigInt(0) };
  }
}

// ── Send transaction ──────────────────────────────────────────────────────

export interface SendTxParams {
  userId: string;
  to: string;
  amountMatic: string; // human-readable, e.g. "0.1"
}

export interface TxResult {
  txHash: string;
  explorerUrl: string;
}

/**
 * Sends MATIC from the user's wallet to a recipient address.
 * Handles gas estimation automatically.
 */
export async function sendPolygonTransaction(params: SendTxParams): Promise<TxResult> {
  const { userId, to, amountMatic } = params;

  if (!ethers.isAddress(to)) {
    throw new Error("Invalid recipient address");
  }

  const wallet = getPolygonWallet(userId);
  const value = ethers.parseEther(amountMatic);

  // Check balance before sending
  const { wei: balance } = await getPolygonBalance(wallet.address);
  const feeData = await getPolygonProvider().getFeeData();
  const gasLimit = BigInt(21000);
  const gasPrice = feeData.gasPrice ?? ethers.parseUnits("30", "gwei");
  const gasCost = gasLimit * gasPrice;

  if (balance < value + gasCost) {
    throw new Error(
      "Insufficient balance. Need " +
      ethers.formatEther(value + gasCost) +
      " MATIC (including gas)"
    );
  }

  const tx = await wallet.sendTransaction({ to, value, gasLimit });
  await tx.wait(1); // wait for 1 confirmation

  return {
    txHash: tx.hash,
    explorerUrl: ACTIVE_NETWORK.explorerUrl + "/tx/" + tx.hash,
  };
}

// ── Network info ──────────────────────────────────────────────────────────

export { ACTIVE_NETWORK };
