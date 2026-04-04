"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { getWalletInfo, addTestETH, simulateTransaction } from "@/services/walletService";
import { getEthPriceINR, formatINR, formatETH, ethToINR } from "@/utils/getEthPrice";

export default function WalletCard() {
  const supabase = createClient();
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [priceLoading, setPriceLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customAmount, setCustomAmount] = useState("");

  useEffect(() => {
    loadWallet();
    loadPrice();

    // Auto-refresh price every 60 seconds
    const interval = setInterval(loadPrice, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const walletInfo = await getWalletInfo(user.id);
      setAddress(walletInfo.address);
      setBalance(walletInfo.balance);
    } catch (err) {
      console.error("Failed to load wallet:", err);
    }
    setLoading(false);
  };

  const loadPrice = async () => {
    setPriceLoading(true);
    try {
      const price = await getEthPriceINR();
      setEthPrice(price);
    } catch (err) {
      console.error("Failed to load ETH price:", err);
    }
    setPriceLoading(false);
  };

  const handleAddETH = async (amount: number) => {
    setAdding(true);
    setShowCustomInput(false);
    setCustomAmount("");
    setToast("Transaction Pending...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await simulateTransaction("faucet");
      const newBalance = await addTestETH(user.id, amount);
      setBalance(newBalance);
      setToast(`✅ ${amount} ETH added (Demo)`);
      setTimeout(() => setToast(""), 3000);
    } catch {
      setToast("❌ Failed to add ETH");
      setTimeout(() => setToast(""), 3000);
    }
    setAdding(false);
  };

  const handleCustomSubmit = () => {
    const val = parseFloat(customAmount);
    if (!val || val <= 0 || val > 100) {
      setToast("❌ Enter a value between 0.001 and 100");
      setTimeout(() => setToast(""), 2000);
      return;
    }
    handleAddETH(val);
  };

  const balanceINR = ethToINR(balance, ethPrice);

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5e9f0]">
        <p className="text-sm text-[#6b7280]">Loading wallet...</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#e5e9f0]">
        <p className="text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">Wallet</p>
        <p className="text-sm text-[#9ca3af]">No wallet connected</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1a2fb8] to-[#4f46e5] rounded-3xl p-5 shadow-lg text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold tracking-widest uppercase opacity-80">Smart Wallet</p>
          <div className="flex items-center gap-1 bg-white bg-opacity-20 rounded-full px-2 py-1">
            <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse" />
            <span className="text-[10px] font-bold">Connected</span>
          </div>
        </div>

        {/* Address */}
        <div className="mb-4">
          <p className="text-xs opacity-70 mb-1">Address</p>
          <p className="font-mono text-sm font-semibold">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>

        {/* Balance */}
        <div className="mb-2">
          <p className="text-xs opacity-70 mb-1">Balance</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-black">{formatETH(balance).replace(' ETH', '')}</p>
            <p className="text-sm font-bold opacity-80">ETH</p>
          </div>
        </div>

        {/* INR Value */}
        <div className="mb-4 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold opacity-90">
              ~{formatINR(balanceINR)}
            </p>
            <button
              onClick={loadPrice}
              disabled={priceLoading}
              className="text-xs opacity-70 hover:opacity-100 transition-opacity disabled:opacity-40"
            >
              {priceLoading ? (
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] opacity-60 mt-1">
            1 ETH = {formatINR(ethPrice)}
          </p>
        </div>

        {/* Faucet */}
        {showCustomInput ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-white bg-opacity-20 rounded-xl px-3 py-2">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                placeholder="0.5"
                step="0.1"
                min="0.001"
                max="100"
                autoFocus
                className="flex-1 bg-transparent outline-none text-white font-bold text-base placeholder-white placeholder-opacity-40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ colorScheme: "dark" }}
              />
              <span className="text-white text-sm font-bold opacity-70">ETH</span>
            </div>
            {/* Preset buttons */}
            <div className="flex gap-2">
              {[0.5, 1, 2, 5].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAddETH(preset)}
                  disabled={adding}
                  className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-xs font-bold py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  +{preset}
                </button>
              ))}
            </div>
            {/* Confirm / Cancel */}
            <div className="flex gap-2">
              <button
                onClick={handleCustomSubmit}
                disabled={adding || !customAmount}
                className="flex-1 bg-white text-[#1a2fb8] rounded-xl py-2.5 font-bold text-sm hover:bg-opacity-90 transition-all disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add ETH"}
              </button>
              <button
                onClick={() => { setShowCustomInput(false); setCustomAmount(""); }}
                className="w-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl font-bold text-base transition-all"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            disabled={adding}
            className="w-full bg-white text-[#1a2fb8] rounded-xl py-3 font-bold text-sm hover:bg-opacity-90 transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {adding ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a2fb8" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#1a2fb8">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Add Test ETH (Faucet)
              </>
            )}
          </button>
        )}

        {/* Toast */}
        {toast && (
          <div className="mt-3 bg-white bg-opacity-20 rounded-xl px-3 py-2 text-xs font-semibold text-center animate-fade-in">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
