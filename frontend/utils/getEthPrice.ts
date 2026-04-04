// Cache for ETH price to avoid excessive API calls
let cachedPrice: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60000; // 1 minute

export async function getEthPriceINR(): Promise<number> {
  // Return cached price if still valid
  const now = Date.now();
  if (cachedPrice && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedPrice;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=inr',
      { cache: 'no-store' }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }

    const data = await response.json();
    const price = data.ethereum?.inr;

    if (typeof price === 'number' && price > 0) {
      cachedPrice = price;
      lastFetchTime = now;
      return price;
    }

    throw new Error('Invalid price data');
  } catch (error) {
    console.error('Error fetching ETH price:', error);
    
    // Fallback to cached price if available
    if (cachedPrice) {
      return cachedPrice;
    }

    // Default fallback price (approximate)
    return 250000; // ₹2,50,000 per ETH
  }
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatETH(amount: number): string {
  return `${amount.toFixed(4)} ETH`;
}

export function ethToINR(ethAmount: number, ethPrice: number): number {
  return ethAmount * ethPrice;
}

export function inrToETH(inrAmount: number, ethPrice: number): number {
  return inrAmount / ethPrice;
}
