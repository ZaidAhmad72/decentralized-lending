/**
 * Collateral Calculator
 * Calculates collateral requirements and liquidation thresholds
 * based on credit score and crypto risk category
 */

import { CryptoSymbol, CRYPTO_CONFIGS, RiskCategory } from './cryptoConfig';

export interface CollateralResult {
  collateralPercentage: number;
  collateralAmount: number; // in crypto
  collateralINR: number;
  liquidationThreshold: number; // in crypto (always 112.5%)
  liquidationINR: number;
  riskCategory: RiskCategory;
}

/**
 * Calculate collateral requirements based on credit score and crypto risk
 * 
 * @param loanAmount - Loan amount in crypto
 * @param cryptoSymbol - Crypto being borrowed
 * @param creditScore - User's credit score (0-1000)
 * @param priceINR - Current price of crypto in INR
 * @returns Collateral calculation result
 */
export function calculateCollateral(
  loanAmount: number,
  cryptoSymbol: CryptoSymbol,
  creditScore: number,
  priceINR: number
): CollateralResult {
  const config = CRYPTO_CONFIGS[cryptoSymbol];
  const riskCategory = config.riskCategory;
  
  // Get collateral percentage based on risk and credit score
  const collateralPercentage = getCollateralPercentage(riskCategory, creditScore);
  
  // Calculate collateral
  const collateralAmount = loanAmount * (collateralPercentage / 100);
  const collateralINR = collateralAmount * priceINR;
  
  // Calculate liquidation threshold (always 112.5%)
  const liquidationThreshold = loanAmount * 1.125;
  const liquidationINR = liquidationThreshold * priceINR;
  
  return {
    collateralPercentage,
    collateralAmount,
    collateralINR,
    liquidationThreshold,
    liquidationINR,
    riskCategory,
  };
}

/**
 * Get collateral percentage based on risk category and credit score
 * 
 * Standard Coins:
 * - New User (500): 120%
 * - < 500: 125%
 * - 500-700: 120%
 * - 700-900: 118.5%
 * - 900+: 117.5%
 * 
 * Stablecoins: Standard - 2.5%
 * Memecoins: Higher collateral (120-130%)
 */
function getCollateralPercentage(
  riskCategory: RiskCategory,
  creditScore: number
): number {
  // Standard coins collateral table
  const standardTable: Record<string, number> = {
    'new': 120,      // 500 (default)
    'low': 125,      // < 500
    'medium': 120,   // 500-700
    'high': 118.5,   // 700-900
    'excellent': 117.5, // 900+
  };
  
  // Stablecoins: Standard - 2.5%
  const stablecoinTable: Record<string, number> = {
    'new': 117.5,
    'low': 122.5,
    'medium': 117.5,
    'high': 116,
    'excellent': 115,
  };
  
  // Memecoins: Higher collateral
  const memecoinTable: Record<string, number> = {
    'new': 125,
    'low': 130,
    'medium': 125,
    'high': 122.5,
    'excellent': 120,
  };
  
  // Determine credit tier
  let tier: string;
  if (creditScore === 500) {
    tier = 'new';
  } else if (creditScore < 500) {
    tier = 'low';
  } else if (creditScore >= 500 && creditScore < 700) {
    tier = 'medium';
  } else if (creditScore >= 700 && creditScore < 900) {
    tier = 'high';
  } else {
    tier = 'excellent';
  }
  
  // Select table based on risk category
  let table: Record<string, number>;
  if (riskCategory === 'stablecoin') {
    table = stablecoinTable;
  } else if (riskCategory === 'memecoin') {
    table = memecoinTable;
  } else {
    table = standardTable;
  }
  
  return table[tier];
}

/**
 * Check if collateral is sufficient (for future use)
 */
export function isCollateralSufficient(
  collateralValue: number,
  loanValue: number
): boolean {
  if (loanValue === 0) return true;
  return (collateralValue / loanValue) >= 1.125;
}
