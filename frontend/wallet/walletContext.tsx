"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { getSmartWalletAddress, getWalletBalance } from "./walletClient";

interface WalletState {
  address: string | null;
  balance: string;
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
    loading: true,
    error: null,
  });

  const initWallet = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState({ address: null, balance: "0.0000", loading: false, error: null });
        return;
      }

      // Check if wallet already stored in DB
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_address")
        .eq("id", user.id)
        .single();

      let address = profile?.wallet_address as string | null;

      if (!address) {
        // Derive and store wallet address
        address = await getSmartWalletAddress(user.id);
        await supabase
          .from("profiles")
          .update({ wallet_address: address })
          .eq("id", user.id);
      }

      const balance = await getWalletBalance(address);
      setState({ address, balance, loading: false, error: null });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : "Wallet init failed",
      }));
    }
  };

  const refreshBalance = async () => {
    if (!state.address) return;
    const balance = await getWalletBalance(state.address);
    setState((s) => ({ ...s, balance }));
  };

  useEffect(() => {
    initWallet();
    // Re-init on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") initWallet();
      if (event === "SIGNED_OUT") setState({ address: null, balance: "0.0000", loading: false, error: null });
    });
    return () => subscription.unsubscribe();
  }, []);

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
