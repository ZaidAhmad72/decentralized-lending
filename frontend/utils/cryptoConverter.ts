/**
 * Crypto Converter
 * Converts between different cryptocurrencies and ETH for backend compatibility
 */

import { CryptoSymbol } from './cryptoConfig';
import { cryptoToINR, inrToCrypto } from './cryptoPriceService';

/**
 * Convert any crypto amount to ETH for backend compatibility
 * Backend expects ETH, so we convert: Crypto → INR → ETH
 * 
 * @param amount - Amount in source crypto
 * @param fromSymbol - Source cryptocurrency
 * @param cryptoPrices - Current crypto prices in INR
 * @param ethPrice - Current ETH price in INR
 * @returns Amount in ETH
 */
export function cryptoToETH(
  amount: number,
  fromSymbol: CryptoSymbol,
  cryptoPrices: Record<CryptoSymbol, number>,
  ethPrice: number
): number {
  // If already ETH, return as-is
  if (fromSymbol === 'ETH') {
    return amount;
  }
  
  // Convert to INR first
  const inr = cryptoToINR(amount, fromSymbol, cryptoPrices);
  
  // Convert INR to ETH
  if (ethPrice === 0) return 0;
  return inr / ethPrice;
}

/**
 * Convert ETH to any crypto for display
 * 
 * @param ethAmount - Amount in ETH
 * @param toSymbol - Target cryptocurrency
 * @param cryptoPrices - Current crypto prices in INR
 * @param ethPrice - Current ETH price in INR
 * @returns Amount in target crypto
 */
export function ethToCrypto(
  ethAmount: number,
  toSymbol: CryptoSymbol,
  cryptoPrices: Record<CryptoSymbol, number>,
  ethPrice: number
): number {
  // If target is ETH, return as-is
  if (toSymbol === 'ETH') {
    return ethAmount;
  }
  
  // Convert ETH to INR
  const inr = ethAmount * ethPrice;
  
  // Convert INR to target crypto
  return inrToCrypto(inr, toSymbol, cryptoPrices);
}

/**
 * Convert between two different cryptos
 * 
 * @param amount - Amount in source crypto
 * @param fromSymbol - Source cryptocurrency
 * @param toSymbol - Target cryptocurrency
 * @param cryptoPrices - Current crypto prices in INR
 * @returns Amount in target crypto
 */
export function convertCrypto(
  amount: number,
  fromSymbol: CryptoSymbol,
  toSymbol: CryptoSymbol,
  cryptoPrices: Record<CryptoSymbol, number>
): number {
  // If same crypto, return as-is
  if (fromSymbol === toSymbol) {
    return amount;
  }
  
  // Convert via INR
  const inr = cryptoToINR(amount, fromSymbol, cryptoPrices);
  return inrToCrypto(inr, toSymbol, cryptoPrices);
}
