"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Tooltip from "@/components/Tooltip";
import { createClient } from "@/utils/supabase/client";
import { borrowFromPool } from "@/services/loanService";
import { getPoolStats } from "@/services/poolService";
import { getReputation, getMaxLTV, getCreditTier, getScoreBreakdown } from "@/services/reputationService";
import { getEthPriceINR, formatINR, ethToINR } from "@/utils/getEthPrice";
import CreditScoreDisplay from "@/components/CreditScoreDisplay";
import { getFraudProfile, type FraudProfile } from "@/services/fraudDetection";
import { BlacklistBanner, FraudWarning } from "@/components/FraudBanner";
import type { ScoreBreakdown as ScoreBreakdownType } from "@/services/creditScoreService";
import { showToast } from "@/components/Toast";
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
  inrToCrypto,
  getCacheAge 
} from "@/utils/cryptoPriceService";
import { calculateCollateral } from "@/utils/collateralCalculator";
import { cryptoToETH } from "@/utils/cryptoConverter";

const DURATION_OPTIONS = [
  { label: "7 Days", days: 7 },
  { label: "14 Days", days: 14 },
  { label: "30 Days", days: 30 },
  { label: "60 Days", days: 60 },
  { label: "90 Days", days: 90 },
];

const DAILY_RATE = 0.024;

export default function RequestLoanPage() {
  const router = useRouter();
  const supabase = createClient();

  // Existing state
  const [amount, setAmount] = useState("");
  const [durationLabel, setDurationLabel] = useState("30 Days");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableLiquidity, setAvailableLiquidity] = useState(0);
  const [ethPrice, setEthPrice] = useState(0);
  const [creditScore, setCreditScore] = useState(500);
  const [creditTier, setCreditTier] = useState("Good");
  const [maxLTV, setMaxLTV] = useState(0.75);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdownType | undefined>(undefined);
  const [fraudProfile, setFraudProfile] = useState<FraudProfile>({ fraud_score: 0, fraud_flags: [], fraud_count: 0, status: "ACTIVE" });

  // New state for multi-crypto
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoSymbol>('ETH');
  const [cryptoPrices, setCryptoPrices] = useState<Record<CryptoSymbol, number>>({} as any);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesCached, setPricesCached] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [lastPriceUpdate, setLastPriceUpdate] = useState(0);

  // Load initial data
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/"); return; }

        const [stats, price, rep, breakdown] = await Promise.all([
          getPoolStats(),
          getEthPriceINR(),
          getReputation(user.id),
          getScoreBreakdown(user.id),
        ]);

        setAvailableLiquidity(stats.total_liquidity - stats.total_borrowed);
        setEthPrice(price);
        setCreditScore(rep.credit_score);
        setCreditTier(getCreditTier(rep.credit_score));
        setMaxLTV(getMaxLTV(rep.credit_score));
        setScoreBreakdown(breakdown);

        const fp = await getFraudProfile(user.id);
        setFraudProfile(fp);
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
        setPricesCached(result.cached);
        setPriceError(result.error || null);
        setLastPriceUpdate(Date.now());
      } catch (err) {
        setPriceError('Failed to load prices');
        console.error('Price fetch error:', err);
      }
      setPricesLoading(false);
    };
    
    loadPrices();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculations
  const selectedDays = DURATION_OPTIONS.find((d) => d.label === durationLabel)?.days ?? 30;
  const amountNum = amount ? parseFloat(amount) : 0;
  const currentPrice = getCryptoPrice(selectedCrypto, cryptoPrices);
  const amountINR = amountNum > 0 ? cryptoToINR(amountNum, selectedCrypto, cryptoPrices) : 0;
  const amountETH = amountNum > 0 ? cryptoToETH(amountNum, selectedCrypto, cryptoPrices, ethPrice) : 0;
  const estInterest = amountINR ? (amountINR * (DAILY_RATE / 100) * selectedDays).toFixed(0) : "—";
  const availableLiquidityINR = ethToINR(availableLiquidity, ethPrice);
  const maxBorrowINR = availableLiquidityINR * maxLTV;
  const maxBorrowCrypto = currentPrice > 0 ? inrToCrypto(maxBorrowINR, selectedCrypto, cryptoPrices) : 0;

  // Calculate collateral using useMemo
  const collateralResult = useMemo(() => {
    if (!amount || amountNum <= 0 || currentPrice === 0) return null;
    return calculateCollateral(amountNum, selectedCrypto, creditScore, currentPrice);
  }, [amount, amountNum, selectedCrypto, creditScore, currentPrice]);

  const tierColor: Record<string, string> = {
    Excellent: "bg-[#4ade80] text-[#14532d]",
    Good: "bg-[#bfdbfe] text-[#1e40af]",
    Fair: "bg-[#fef3c7] text-[#d97706]",
    Poor: "bg-red-100 text-red-600",
  };

  const handleSubmit = async () => {
    setError("");
    
    if (!amount || amountNum <= 0) {
      setError("Enter a valid loan amount.");
      return;
    }
    
    if (currentPrice === 0) {
      setError("Price unavailable for selected cryptocurrency.");
      return;
    }
    
    if (amountINR > maxBorrowINR) {
      setError(
        `Amount exceeds your credit limit of ${formatINR(maxBorrowINR)} (LTV ${(maxLTV * 100).toFixed(0)}%)`
      );
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      
      // Convert to ETH for backend
      await borrowFromPool(user.id, amountETH, selectedDays, selectedCrypto, amountNum);
      showToast(
        "success",
        "Loan Approved!",
        `${formatCryptoAmount(amountNum, selectedCrypto)} ${selectedCrypto} (${formatINR(amountINR)}) transferred to your wallet.`
      );
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to borrow from pool.");
    }
    setLoading(false);
  };

  const riskCategory = CRYPTO_CONFIGS[selectedCrypto].riskCategory;
  const riskLabel = RISK_LABELS[riskCategory];
  const riskColor = RISK_COLORS[riskCategory];

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20">
      <div className="lg:hidden flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm border border-[#e5e9f0] dark:border-gray-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#374151"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
          </button>
          <span className="text-[#1a2fb8] dark:text-blue-400 font-bold text-lg tracking-tight">Vault</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-10">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-black text-[#111827] dark:text-white mb-2">Borrow from Pool</h1>
          <p className="text-[#6b7280] dark:text-gray-400 text-sm lg:text-base leading-relaxed">
            Available: {formatINR(availableLiquidityINR)} · Your limit: {formatINR(maxBorrowINR)}
          </p>
        </div>

        {/* Blacklist / Fraud warnings */}
        {fraudProfile.status === "BLACKLISTED"
          ? <BlacklistBanner />
          : <FraudWarning riskLevel={fraudProfile.fraud_score >= 60 ? "High" : fraudProfile.fraud_score >= 30 ? "Medium" : "Low"} flags={fraudProfile.fraud_flags.slice(-3)} />
        }

        {/* Enhanced Credit Score Display */}
        <div className="mb-5">
          <CreditScoreDisplay 
            score={creditScore} 
            tier={creditTier} 
            breakdown={scoreBreakdown}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="w-full lg:w-[560px] lg:flex-shrink-0 flex flex-col gap-5">

            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 flex flex-col gap-5">
              {/* Crypto Selector + Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase">Loan Amount</label>
                  <button
                    onClick={() => setAmount(formatCryptoAmount(maxBorrowCrypto, selectedCrypto))}
                    className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400 hover:underline"
                    disabled={pricesLoading || currentPrice === 0}
                  >
                    Max: {formatCryptoAmount(maxBorrowCrypto, selectedCrypto)} {selectedCrypto}
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
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap ${riskColor}`}>
                    {riskLabel}
                  </span>
                </div>

                {/* Amount Input */}
                <div className="flex items-center bg-[#f9fafb] dark:bg-gray-700 rounded-2xl px-4 py-4 border border-[#e5e9f0] dark:border-gray-600 gap-3">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    step={getStepForCrypto(selectedCrypto)}
                    className="flex-1 outline-none text-xl font-bold text-[#374151] dark:text-white placeholder-[#d1d5db] dark:placeholder-gray-500 bg-transparent"
                    disabled={pricesLoading}
                  />
                  <div className="w-8 h-8 bg-[#eef2ff] dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1a2fb8">
                      <path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                    </svg>
                  </div>
                </div>
                
                {/* INR Equivalent */}
                {amount && amountNum > 0 && currentPrice > 0 && (
                  <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-2">
                    ≈ {formatINR(amountINR)}
                  </p>
                )}
                
                {/* Price Loading/Error */}
                {pricesLoading && (
                  <p className="text-xs text-[#6b7280] dark:text-gray-400 mt-2">Loading prices...</p>
                )}
                {priceError && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">{priceError}</p>
                )}
              </div>

              {/* Duration Selector */}
              <div>
                <label className="block text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-2">Repayment Term</label>
                <div className="flex items-center bg-[#f9fafb] dark:bg-gray-700 rounded-2xl px-4 py-4 border border-[#e5e9f0] dark:border-gray-600">
                  <select
                    value={durationLabel}
                    onChange={(e) => setDurationLabel(e.target.value)}
                    className="flex-1 outline-none text-base font-semibold text-[#374151] dark:text-white bg-transparent appearance-none cursor-pointer"
                  >
                    {DURATION_OPTIONS.map((d) => <option key={d.label}>{d.label}</option>)}
                  </select>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#6b7280"><path d="M7 10l5 5 5-5z" /></svg>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm rounded-2xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !amount || amountNum <= 0 || currentPrice === 0 || fraudProfile.status === "BLACKLISTED"}
              className="w-full bg-[#1a2fb8] dark:bg-blue-600 text-white rounded-2xl py-5 font-bold text-lg flex items-center justify-center gap-3 hover:bg-[#1527a0] dark:hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>Borrow from Pool <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" /></svg></>
              )}
            </button>
          </div>

          <div className="w-full lg:flex-1 flex flex-col gap-5">
            {/* Loan Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700">
              <p className="text-xs font-semibold tracking-widest text-[#6b7280] dark:text-gray-400 uppercase mb-4">Loan Summary</p>
              <div className="flex flex-col gap-3">
                {/* Requested Amount */}
                <div className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700">
                  <span className="text-sm text-[#6b7280] dark:text-gray-400">Requested Amount</span>
                  <span className="text-sm font-bold text-[#111827] dark:text-white">
                    {amount && amountNum > 0 ? `${formatCryptoAmount(amountNum, selectedCrypto)} ${selectedCrypto}` : "—"}
                    {amount && amountNum > 0 && currentPrice > 0 && (
                      <span className="text-xs text-[#6b7280] dark:text-gray-400 ml-1">({formatINR(amountINR)})</span>
                    )}
                  </span>
                </div>

                {/* Collateral Required */}
                {collateralResult && (
                  <div className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700">
                    <span className="text-sm text-[#6b7280] dark:text-gray-400 flex items-center gap-1">
                      Collateral Required
                      <Tooltip text="Collateral requirement varies based on asset volatility and your credit score. Higher volatility assets require higher collateral." />
                    </span>
                    <span className="text-sm font-bold text-[#111827] dark:text-white">
                      {formatCryptoAmount(collateralResult.collateralAmount, selectedCrypto)} {selectedCrypto}
                      <span className="text-xs text-[#6b7280] dark:text-gray-400 ml-1">
                        ({formatINR(collateralResult.collateralINR)})
                      </span>
                    </span>
                  </div>
                )}

                {/* Repayment Term */}
                <div className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700">
                  <span className="text-sm text-[#6b7280] dark:text-gray-400">Repayment Term</span>
                  <span className="text-sm font-bold text-[#111827] dark:text-white">{durationLabel}</span>
                </div>

                {/* Liquidation Threshold */}
                {collateralResult && (
                  <div className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700">
                    <span className="text-sm text-[#6b7280] dark:text-gray-400 flex items-center gap-1">
                      Liquidation Threshold
                      <Tooltip text="Loan is liquidated if collateral value drops below 112.5% of loan value." />
                    </span>
                    <span className="text-sm font-bold text-[#111827] dark:text-white">
                      {formatCryptoAmount(collateralResult.liquidationThreshold, selectedCrypto)} {selectedCrypto}
                      <span className="text-xs text-[#6b7280] dark:text-gray-400 ml-1">
                        ({formatINR(collateralResult.liquidationINR)})
                      </span>
                    </span>
                  </div>
                )}

                {/* Daily Rate */}
                <div className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700">
                  <span className="text-sm text-[#6b7280] dark:text-gray-400">Daily Rate</span>
                  <span className="text-sm font-bold text-[#111827] dark:text-white">{DAILY_RATE}%</span>
                </div>

                {/* Est. Total Interest */}
                <div className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700">
                  <span className="text-sm text-[#6b7280] dark:text-gray-400">Est. Total Interest</span>
                  <span className="text-sm font-bold text-[#111827] dark:text-white">
                    {amount && amountNum > 0 ? formatINR(parseFloat(estInterest)) : "—"}
                  </span>
                </div>

                {/* Est. Total Repayment */}
                <div className="flex justify-between items-center py-2 border-b border-[#f3f4f6] dark:border-gray-700 last:border-0">
                  <span className="text-sm text-[#6b7280] dark:text-gray-400">Est. Total Repayment</span>
                  <span className="text-sm font-bold text-[#111827] dark:text-white">
                    {amount && amountNum > 0 ? formatINR(amountINR + parseFloat(estInterest)) : "—"}
                  </span>
                </div>
              </div>

              {/* Price Status */}
              {lastPriceUpdate > 0 && (
                <div className="mt-4 pt-4 border-t border-[#f3f4f6] dark:border-gray-700">
                  <p className="text-xs text-[#6b7280] dark:text-gray-400">
                    {pricesCached ? `Using cached prices (${getCacheAge()}s ago)` : 'Prices updated just now'}
                  </p>
                </div>
              )}
            </div>

            {/* Credit tier info - Risk-adjusted */}
            <div className="bg-[#eef2ff] dark:bg-blue-900/20 rounded-3xl p-5 border border-[#c7d2fe] dark:border-blue-800">
              <p className="text-xs font-bold text-[#1a2fb8] dark:text-blue-400 uppercase tracking-widest mb-3">
                Collateral Tiers ({CRYPTO_CONFIGS[selectedCrypto].name})
              </p>
              <div className="flex flex-col gap-2">
                {(() => {
                  // Get collateral percentages for each tier based on selected crypto
                  const getCollateralForTier = (score: number) => {
                    const result = calculateCollateral(1, selectedCrypto, score, 1);
                    return result.collateralPercentage;
                  };

                  return [
                    { 
                      tier: "Excellent", 
                      range: "> 800", 
                      collateral: `${getCollateralForTier(900)}%`,
                      active: creditScore > 800 
                    },
                    { 
                      tier: "Good", 
                      range: "600–800", 
                      collateral: `${getCollateralForTier(700)}%`,
                      active: creditScore >= 600 && creditScore <= 800 
                    },
                    { 
                      tier: "Fair / Poor", 
                      range: "< 600", 
                      collateral: `${getCollateralForTier(500)}%`,
                      active: creditScore < 600 
                    },
                  ].map((t) => (
                    <div key={t.tier} className={`flex justify-between items-center px-3 py-2 rounded-xl text-xs font-semibold ${t.active ? "bg-[#1a2fb8] dark:bg-blue-600 text-white" : "text-[#6b7280] dark:text-gray-400"}`}>
                      <span>{t.tier} ({t.range})</span>
                      <span>Collateral {t.collateral}</span>
                    </div>
                  ));
                })()}
              </div>
              <div className="mt-3 pt-3 border-t border-[#c7d2fe] dark:border-blue-800">
                <p className="text-xs text-[#6b7280] dark:text-gray-400">
                  <span className={`font-bold ${riskColor}`}>{riskLabel}</span> assets have {
                    riskCategory === 'stablecoin' ? 'lower' : 
                    riskCategory === 'memecoin' ? 'higher' : 
                    'standard'
                  } collateral requirements
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
