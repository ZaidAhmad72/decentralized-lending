"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Tooltip from "@/components/Tooltip";
import { createClient } from "@/utils/supabase/client";
import { depositToPool, getPoolStats, getUserTotalDeposited } from "@/services/poolService";
import { getWalletInfo, simulateTransaction } from "@/services/walletService";
import { getEthPriceINR, formatINR, ethToINR, inrToETH } from "@/utils/getEthPrice";
import { 
  CryptoSymbol, 
  CRYPTO_CONFIGS, 
  RISK_LABELS, 
  RISK_COLORS,
  getStepForCrypto,
  formatCryptoAmount 
} from "@/utils/cryptoConfig";
import { 
  fetchCryptoPrices, 
  getCryptoPrice, 
  cryptoToINR,
  inrToCrypto 
} from "@/utils/cryptoPriceService";
import { cryptoToETH } from "@/utils/cryptoConverter";

export default function DepositPage() {
  const router = useRouter();
  const supabase = createClient();

  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [txStatus, setTxStatus] = useState<"idle" | "pending" | "success">("idle");
  const [txHash, setTxHash] = useState("");
  const [poolStats, setPoolStats] = useState({ total_liquidity: 0, total_borrowed: 0 });
  const [userDeposited, setUserDeposited] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);

  // Multi-crypto state
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSymbol>('ETH');
  const [cryptoPrices, setCryptoPrices] = useState<Record<CryptoSymbol, number>>({} as any);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(0);

  // Cleanup timer on unmount
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success) {
      timer = setTimeout(() => {
        setSuccess(false);
        setTxStatus("idle");
      }, 5000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [success]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      try {
        const stats = await getPoolStats();
        setPoolStats(stats);
        const deposited = await getUserTotalDeposited(user.id);
        setUserDeposited(deposited);
        const wallet = await getWalletInfo(user.id);
        setWalletBalance(wallet.balance);
        const price = await getEthPriceINR();
        setEthPrice(price);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  // Load crypto prices
  useEffect(() => {
    const loadPrices = async () => {
      setPricesLoading(true);
      try {
        const result = await fetchCryptoPrices();
        setCryptoPrices(result.prices);
        setLastPriceUpdate(Date.now());
      } catch (err) {
        console.error('Price fetch error:', err);
      }
      setPricesLoading(false);
    };
    loadPrices();
  }, []);

  // Get current crypto price
  const currentPrice = useMemo(() => {
    return getCryptoPrice(selectedCrypto, cryptoPrices);
  }, [cryptoPrices, selectedCrypto]);

  // Calculate INR value
  const depositINR = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    return cryptoToINR(amt, selectedCrypto, cryptoPrices);
  }, [amount, selectedCrypto, cryptoPrices]);

  // Calculate max deposit in selected crypto
  const maxDepositCrypto = useMemo(() => {
    if (currentPrice === 0) return 0;
    const walletINR = ethToINR(walletBalance, ethPrice);
    return inrToCrypto(walletINR, selectedCrypto, cryptoPrices);
  }, [walletBalance, ethPrice, selectedCrypto, cryptoPrices, currentPrice]);

  const handleDeposit = async () => {
    setError("");
    setSuccess(false);

    const depositAmountCrypto = parseFloat(amount);
    if (!amount || depositAmountCrypto <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }

    // Convert crypto to ETH for backend
    const depositAmountETH = cryptoToETH(depositAmountCrypto, selectedCrypto, cryptoPrices, ethPrice);
    const walletBalanceINR = ethToINR(walletBalance, ethPrice);

    if (depositINR > walletBalanceINR) {
      setError(`Insufficient wallet balance. Available: ${formatINR(walletBalanceINR)}`);
      return;
    }

    setLoading(true);
    setTxStatus("pending");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }

      // Simulate transaction
      const hash = await simulateTransaction("deposit");
      setTxHash(hash);

      // Deposit in ETH (backend stores ETH)
      await depositToPool(user.id, depositAmountETH);
      setTxStatus("success");
      setSuccess(true);
      setAmount("");

      // Refresh stats
      const stats = await getPoolStats();
      setPoolStats(stats);
      const deposited = await getUserTotalDeposited(user.id);
      setUserDeposited(deposited);
      const wallet = await getWalletInfo(user.id);
      setWalletBalance(wallet.balance);
    } catch (err: unknown) {
      setTxStatus("idle");
      setError(err instanceof Error ? err.message : "Deposit failed.");
    }
    setLoading(false);
  };

  const handleMaxDeposit = () => {
    setAmount(formatCryptoAmount(maxDepositCrypto, selectedCrypto));
  };

  const walletBalanceINR = ethToINR(walletBalance, ethPrice);
  const poolLiquidityINR = ethToINR(poolStats.total_liquidity, ethPrice);
  const poolBorrowedINR = ethToINR(poolStats.total_borrowed, ethPrice);
  const availableLiquidityINR = poolLiquidityINR - poolBorrowedINR;
  const userDepositedINR = ethToINR(userDeposited, ethPrice);

  // Check if deposit is valid
  const isDepositValid = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (pricesLoading || currentPrice === 0) return false;
    return depositINR <= walletBalanceINR;
  }, [amount, depositINR, walletBalanceINR, pricesLoading, currentPrice]);

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20">
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0] dark:border-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <span className="text-[#1a2fb8] font-bold text-lg tracking-tight">Vault</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white mb-2">Deposit to Pool</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm lg:text-base leading-relaxed">
            Add liquidity to the lending pool and enable borrowers to access capital.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Deposit Amount</label>
                  <button
                    onClick={handleMaxDeposit}
                    className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400 hover:underline"
                    disabled={pricesLoading || currentPrice === 0}
                  >
                    Max: {formatCryptoAmount(maxDepositCrypto, selectedCrypto)} {selectedCrypto}
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  {/* Crypto Dropdown */}
                  <div className="relative">
                    <select
                      value={selectedCrypto}
                      onChange={(e) => setSelectedCrypto(e.target.value as CryptoSymbol)}
                      className="appearance-none bg-[#f9fafb] dark:bg-gray-700 border border-[#e5e9f0] dark:border-gray-600 rounded-xl px-4 py-3 pr-10 text-base font-bold text-[#374151] dark:text-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      {Object.keys(CRYPTO_CONFIGS).map((symbol) => (
                        <option key={symbol} value={symbol}>
                          {symbol}
                        </option>
                      ))}
                    </select>
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="#6b7280">
                      <path d="M7 10l5 5 5-5z" />
                    </svg>
                  </div>
                  
                  {/* Risk Badge */}
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${RISK_COLORS[CRYPTO_CONFIGS[selectedCrypto].risk]}`}>
                    {RISK_LABELS[CRYPTO_CONFIGS[selectedCrypto].risk]}
                  </span>
                </div>

                <div className="flex items-center bg-[#f9fafb] dark:bg-gray-700 rounded-2xl px-4 py-4 border border-[#e5e9f0] dark:border-gray-700 gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    step={getStepForCrypto(selectedCrypto)}
                    className="flex-1 outline-none text-xl font-bold text-[#374151] dark:text-white placeholder-[#d1d5db] bg-transparent"
                  />
                  <div className="w-8 h-8 bg-[#eef2ff] dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
                  </div>
                </div>
                {amount && parseFloat(amount) > 0 && (
                  <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-2">
                    ≈ {formatINR(depositINR)}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#15803d">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  <p className="text-sm font-bold text-green-600">Transaction Confirmed!</p>
                </div>
                {txHash && (
                  <p className="text-xs text-green-600 font-mono break-all">
                    {txHash}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleDeposit}
              disabled={loading || !isDepositValid}
              className="w-full bg-[#1a2fb8] text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {txStatus === "pending" ? (
                <>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Transaction Pending...
                </>
              ) : (
                <>
                  Deposit to Pool
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg>
                </>
              )}
            </button>
          </div>

          <div className="w-full lg:flex-1 flex flex-col gap-5">
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Pool Statistics</p>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Total Liquidity", value: formatINR(poolLiquidityINR) },
                  { label: "Total Borrowed", value: formatINR(poolBorrowedINR) },
                  { label: "Available Liquidity", value: formatINR(availableLiquidityINR) },
                  { label: "Your Total Deposited", value: formatINR(userDepositedINR) },
                  { label: "Daily Rate", value: "0.019%", highlight: true },
                  { label: "Expected Yearly Earning", value: depositINR > 0 ? formatINR(depositINR * 0.07) : formatINR(userDepositedINR * 0.07), highlight: true },
                  { label: "Exchange Rate", value: `1 ETH = ${formatINR(ethPrice)}` },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                    <span className="text-sm text-[#6b7280] dark:text-gray-400">{row.label}</span>
                    <span className={`text-sm font-bold ${row.highlight ? 'text-green-600' : 'text-[#111827] dark:text-white'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#f0fdf4] rounded-3xl p-6 border border-[#bbf7d0] flex items-start gap-4">
              <div className="w-10 h-10 bg-[#4ade80] rounded-xl flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#14532d"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[#15803d] mb-1">Earn Yield on Deposits</p>
                <p className="text-xs text-[#16a34a] leading-relaxed">
                  Your deposits enable borrowers to access capital. Interest from loans will be distributed to lenders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Navbar />
    </div>
  );
}

