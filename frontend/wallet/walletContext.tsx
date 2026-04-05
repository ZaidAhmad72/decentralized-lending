"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { getWalletBalance } from "./walletClient";

interface WalletState {
  address: string | null;
  balance: string;       // on-chain balance
  dbBalance: number;     // DB wallet_balance (used by pool system)
  loading: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: "0.0000",
    dbBalance: 0,
    loading: true,
    error: null,
  });

  const initWallet = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ address: null, balance: "0.0000", dbBalance: 0, loading: false, error: null });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address, wallet_balance")
        .eq("id", user.id)
        .single();

      const address = profile?.wallet_address as string | null;
      const dbBalance = profile?.wallet_balance ?? 0;

      // Try on-chain balance; fall back gracefully
      let onChainBalance = "0.0000";
      if (address) {
        try {
          onChainBalance = await getWalletBalance(address);
        } catch { /* network unavailable */ }
      }

      setState({ address, balance: onChainBalance, dbBalance, loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Wallet init failed",
      }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshBalance = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address, wallet_balance")
      .eq("id", user.id)
      .single();

    const dbBalance = profile?.wallet_balance ?? 0;
    setState((s) => ({ ...s, dbBalance }));

    // Also refresh on-chain if address available
    if (profile?.wallet_address) {
      try {
        const balance = await getWalletBalance(profile.wallet_address);
        setState((s) => ({ ...s, balance }));
      } catch { /* keep last known */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    initWallet();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") initWallet();
      if (event === "SIGNED_OUT") setState({ address: null, balance: "0.0000", dbBalance: 0, loading: false, error: null });
    });
    return () => subscription.unsubscribe();
  }, [initWallet]);

  return (
    <WalletContext.Provider value={{ ...state, refreshBalance }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWalletContext must be used inside WalletProvider");
  return ctx;
}
