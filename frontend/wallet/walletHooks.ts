"use client";

import { useWalletContext } from "./walletContext";

/**
 * Primary hook for consuming wallet state throughout the app.
 */
export function useWallet() {
  const { address, balance, loading, error, refreshBalance } = useWalletContext();

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  const isConnected = !!address && !loading;

  return {
    address,
    shortAddress,
    balance,
    loading,
    error,
    isConnected,
    refreshBalance,
  };
}
