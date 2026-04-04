/**
 * Crypto Configuration
 * Defines supported cryptocurrencies, risk categories, and display settings
 */

export type CryptoSymbol = 
  | 'USDC' | 'USDT' 
  | 'BTC' | 'ETH' | 'BNB' | 'SOL' | 'XRP'
  | 'DOGE' | 'PEPE' | 'BONK';

export type RiskCategory = 'stablecoin' | 'standard' | 'memecoin';

export interface CryptoConfig {
  symbol: CryptoSymbol;
  name: string;
  coingeckoId: string;
  riskCategory: RiskCategory;
  decimals: number;
}

export const CRYPTO_CONFIGS: Record<CryptoSymbol, CryptoConfig> = {
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    coingeckoId: 'usd-coin',
    riskCategory: 'stablecoin',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether',
    coingeckoId: 'tether',
    riskCategory: 'stablecoin',
    decimals: 6,
  },
  BTC: {
    symbol: 'BTC',
    name: 'Bitcoin',
    coingeckoId: 'bitcoin',
    riskCategory: 'standard',
    decimals: 8,
  },
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    coingeckoId: 'ethereum',
    riskCategory: 'standard',
    decimals: 18,
  },
  BNB: {
    symbol: 'BNB',
    name: 'BNB',
    coingeckoId: 'binancecoin',
    riskCategory: 'standard',
    decimals: 18,
  },
  SOL: {
    symbol: 'SOL',
    name: 'Solana',
    coingeckoId: 'solana',
    riskCategory: 'standard',
    decimals: 9,
  },
  XRP: {
    symbol: 'XRP',
    name: 'Ripple',
    coingeckoId: 'ripple',
    riskCategory: 'standard',
    decimals: 6,
  },
  DOGE: {
    symbol: 'DOGE',
    name: 'Dogecoin',
    coingeckoId: 'dogecoin',
    riskCategory: 'memecoin',
    decimals: 8,
  },
  PEPE: {
    symbol: 'PEPE',
    name: 'Pepe',
    coingeckoId: 'pepe',
    riskCategory: 'memecoin',
    decimals: 18,
  },
  BONK: {
    symbol: 'BONK',
    name: 'Bonk',
    coingeckoId: 'bonk',
    riskCategory: 'memecoin',
    decimals: 5,
  },
};

export const RISK_LABELS: Record<RiskCategory, string> = {
  stablecoin: 'Low Risk',
  standard: 'Standard Risk',
  memecoin: 'High Risk',
};

export const RISK_COLORS: Record<RiskCategory, string> = {
  stablecoin: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  standard: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  memecoin: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

/**
 * Get step value for input based on crypto decimals
 */
export function getStepForCrypto(symbol: CryptoSymbol): string {
  const config = CRYPTO_CONFIGS[symbol];
  if (config.decimals >= 8) return '0.00000001';
  if (config.decimals >= 6) return '0.000001';
  if (config.decimals >= 4) return '0.0001';
  return '0.01';
}

/**
 * Format crypto amount with appropriate decimal places
 */
export function formatCryptoAmount(amount: number, symbol: CryptoSymbol): string {
  const config = CRYPTO_CONFIGS[symbol];
  const decimals = Math.min(config.decimals, 8); // Cap at 8 for display
  return amount.toFixed(decimals);
}
