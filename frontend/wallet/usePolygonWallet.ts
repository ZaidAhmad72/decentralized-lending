"use client";

import { usePolygonWalletContext } from "./polygonWalletContext";

/**
 * usePolygonWallet — primary hook for Polygon wallet state.
 */
export function usePolygonWallet() {
  const ctx = usePolygonWalletContext();

  const shortAddress = ctx.address
    ? ctx.address.slice(0, 6) + "..." + ctx.address.slice(-4)
    : null;

  return {
    address: ctx.address,
    shortAddress,
    balance: ctx.balance,
    network: ctx.network,
    isLoading: ctx.isLoading,
    error: ctx.error,
    refreshBalance: ctx.refreshBalance,
    sendTransaction: ctx.sendTransaction,
  };
}
