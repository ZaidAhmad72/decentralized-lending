"use client";

import { useWalletContext } from "./walletContext";

export function useWallet() {
  const ctx = useWalletContext();
  const shortAddress = ctx.address
    ? ctx.address.slice(0, 6) + "..." + ctx.address.slice(-4)
    : null;
  const isConnected = !!ctx.address && !ctx.loading;
  return { ...ctx, shortAddress, isConnected };
}

export function useWalletAddress(): string {
  return useWalletContext().address ?? "";
}

export function useWalletReady(): boolean {
  const { loading, address } = useWalletContext();
  return !loading && address !== null;
}
