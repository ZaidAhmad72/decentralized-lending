"use client";

import {
  createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode,
} from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getPolygonAddress, getPolygonBalance, sendPolygonTransaction,
  ACTIVE_NETWORK, type TxResult,
} from "./polygonWalletClient";

export interface PolygonWalletContextType {
  address: string | null;
  balance: string;           // MATIC, formatted
  network: typeof ACTIVE_NETWORK;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
  sendTransaction: (to: string, amountMatic: string) => Promise<TxResult>;
}

const PolygonWalletContext = createContext<PolygonWalletContextType | null>(null);

export function PolygonWalletProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.0000");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!address) return;
    try {
      const { matic } = await getPolygonBalance(address);
      setBalance(matic);
    } catch { /* keep last known */ }
  }, [address]);

  const sendTransaction = useCallback(async (to: string, amountMatic: string): Promise<TxResult> => {
    if (!userIdRef.current) throw new Error("Not authenticated");
    return sendPolygonTransaction({ userId: userIdRef.current, to, amountMatic });
  }, []);

  const initWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      userIdRef.current = user.id;

      // Derive deterministic address (no async, no DB needed)
      const addr = getPolygonAddress(user.id);
      setAddress(addr);

      // Persist to profiles if not already stored
      const { data: profile } = await supabase
        .from("profiles")
        .select("polygon_address")
        .eq("id", user.id)
        .single();

      if (!profile?.polygon_address) {
        await supabase
          .from("profiles")
          .update({ polygon_address: addr })
          .eq("id", user.id);
      }

      // Fetch on-chain balance
      const { matic } = await getPolygonBalance(addr);
      setBalance(matic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet init failed");
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initWallet();

    // Refresh balance every 30 seconds
    intervalRef.current = setInterval(refreshBalance, 30_000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") initWallet();
      if (event === "SIGNED_OUT") {
        setAddress(null);
        setBalance("0.0000");
        setError(null);
        userIdRef.current = null;
      }
    });

    return () => {
      subscription.unsubscribe();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-start interval when address changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(refreshBalance, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [refreshBalance]);

  return (
    <PolygonWalletContext.Provider value={{
      address, balance, network: ACTIVE_NETWORK,
      isLoading, error, refreshBalance, sendTransaction,
    }}>
      {children}
    </PolygonWalletContext.Provider>
  );
}

export function usePolygonWalletContext(): PolygonWalletContextType {
  const ctx = useContext(PolygonWalletContext);
  if (!ctx) throw new Error("usePolygonWalletContext must be inside PolygonWalletProvider");
  return ctx;
}
