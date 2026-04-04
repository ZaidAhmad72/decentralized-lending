# Technical Design: Collateral & Multi-Crypto Borrowing

## Design Overview

This design extends the existing borrow page (`frontend/app/request-loan/page.tsx`) with multi-cryptocurrency support, risk-based collateral calculations, and liquidation thresholds - all implemented as frontend-only features without backend modifications.

## Architecture Principles

1. **No Backend Changes** - All logic in frontend
2. **Extend, Don't Replace** - Build on existing components
3. **Type Safety** - Full TypeScript coverage
4. **Performance First** - Caching, debouncing, memoization
5. **Graceful Degradation** - Handle API failures elegantly

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    request-loan/page.tsx                     │
│                    (Main Component)                          │
└────────────┬────────────────────────────┬───────────────────┘
             │                            │
             │                            │
    ┌────────▼────────┐          ┌───────▼────────┐
    │  Crypto Price   │          │  Collateral    │
    │  Service        │          │  Calculator    │
    │                 │          │                │
    │ - fetchPrices() │          │ - calculate()  │
    │ - caching       │          │ - getRisk()    │
    │ - debouncing    │          │ - getLiquid()  │
    └─────────────────┘          └────────────────┘
```

## Data Structures

### Crypto Configuration

```typescript
// utils/cryptoConfig.ts

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
```

### Price Cache Structure

```typescript
// utils/cryptoPriceService.ts

interface PriceCache {
  prices: Record<CryptoSymbol, number>; // Price in INR
  timestamp: number;
  expiresAt: number;
}

interface PriceFetchResult {
  prices: Record<CryptoSymbol, number>;
  cached: boolean;
  error?: string;
}
```

## Core Utilities

### 1. Collateral Calculator

```typescript
// utils/collateralCalculator.ts

export interface CollateralResult {
  collateralPercentage: number;
  collateralAmount: number; // in crypto
  collateralINR: number;
  liquidationThreshold: number; // in crypto
  liquidationINR: number;
  riskCategory: RiskCategory;
}

/**
 * Calculate collateral requirements based on credit score and crypto risk
 */
export function calculateCollateral(
  loanAmount: number, // in crypto
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
  if (creditScore === 500) tier = 'new';
  else if (creditScore < 500) tier = 'low';
  else if (creditScore >= 500 && creditScore < 700) tier = 'medium';
  else if (creditScore >= 700 && creditScore < 900) tier = 'high';
  else tier = 'excellent';
  
  // Select table based on risk category
  let table: Record<string, number>;
  if (riskCategory === 'stablecoin') table = stablecoinTable;
  else if (riskCategory === 'memecoin') table = memecoinTable;
  else table = standardTable;
  
  return table[tier];
}
```

### 2. Crypto Price Service

```typescript
// utils/cryptoPriceService.ts

const CACHE_DURATION = 10000; // 10 seconds
const API_ENDPOINT = 'https://api.coingecko.com/api/v3/simple/price';

let priceCache: PriceCache | null = null;
let fetchPromise: Promise<PriceFetchResult> | null = null;

/**
 * Fetch crypto prices with caching and deduplication
 */
export async function fetchCryptoPrices(): Promise<PriceFetchResult> {
  // Return cached prices if still valid
  if (priceCache && Date.now() < priceCache.expiresAt) {
    return {
      prices: priceCache.prices,
      cached: true,
    };
  }
  
  // Deduplicate concurrent requests
  if (fetchPromise) {
    return fetchPromise;
  }
  
  fetchPromise = fetchPricesFromAPI();
  const result = await fetchPromise;
  fetchPromise = null;
  
  return result;
}

async function fetchPricesFromAPI(): Promise<PriceFetchResult> {
  try {
    const ids = Object.values(CRYPTO_CONFIGS)
      .map(c => c.coingeckoId)
      .join(',');
    
    const response = await fetch(
      `${API_ENDPOINT}?ids=${ids}&vs_currencies=inr`,
      { 
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Map response to our structure
    const prices: Record<CryptoSymbol, number> = {} as any;
    
    Object.entries(CRYPTO_CONFIGS).forEach(([symbol, config]) => {
      const price = data[config.coingeckoId]?.inr;
      if (price) {
        prices[symbol as CryptoSymbol] = price;
      }
    });
    
    // Update cache
    priceCache = {
      prices,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };
    
    return {
      prices,
      cached: false,
    };
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    
    // Return cached prices if available, even if expired
    if (priceCache) {
      return {
        prices: priceCache.prices,
        cached: true,
        error: 'Using cached prices (API unavailable)',
      };
    }
    
    throw error;
  }
}

/**
 * Get price for a specific crypto
 */
export function getCryptoPrice(
  symbol: CryptoSymbol,
  prices: Record<CryptoSymbol, number>
): number {
  return prices[symbol] || 0;
}

/**
 * Convert crypto amount to INR
 */
export function cryptoToINR(
  amount: number,
  symbol: CryptoSymbol,
  prices: Record<CryptoSymbol, number>
): number {
  const price = getCryptoPrice(symbol, prices);
  return amount * price;
}

/**
 * Convert INR to crypto amount
 */
export function inrToCrypto(
  inr: number,
  symbol: CryptoSymbol,
  prices: Record<CryptoSymbol, number>
): number {
  const price = getCryptoPrice(symbol, prices);
  if (price === 0) return 0;
  return inr / price;
}
```

### 3. Crypto to ETH Converter

```typescript
// utils/cryptoConverter.ts

/**
 * Convert any crypto amount to ETH for backend compatibility
 * Backend expects ETH, so we convert: Crypto → INR → ETH
 */
export function cryptoToETH(
  amount: number,
  fromSymbol: CryptoSymbol,
  cryptoPrices: Record<CryptoSymbol, number>,
  ethPrice: number
): number {
  // Convert to INR first
  const inr = cryptoToINR(amount, fromSymbol, cryptoPrices);
  
  // Convert INR to ETH
  if (ethPrice === 0) return 0;
  return inr / ethPrice;
}

/**
 * Convert ETH to any crypto for display
 */
export function ethToCrypto(
  ethAmount: number,
  toSymbol: CryptoSymbol,
  cryptoPrices: Record<CryptoSymbol, number>,
  ethPrice: number
): number {
  // Convert ETH to INR
  const inr = ethAmount * ethPrice;
  
  // Convert INR to target crypto
  return inrToCrypto(inr, toSymbol, cryptoPrices);
}
```

## Component Design

### Main Page State

```typescript
// app/request-loan/page.tsx

interface PageState {
  // Existing state
  amount: string;
  durationLabel: string;
  loading: boolean;
  error: string;
  availableLiquidity: number;
  ethPrice: number;
  creditScore: number;
  creditTier: string;
  maxLTV: number;
  
  // New state
  selectedCrypto: CryptoSymbol;
  cryptoPrices: Record<CryptoSymbol, number>;
  pricesLoading: boolean;
  pricesCached: boolean;
  priceError: string | null;
  lastPriceUpdate: number;
}
```

### UI Components Structure

```
request-loan/page.tsx
├── Credit Score Banner (existing)
├── Loan Input Section
│   ├── Crypto Selector Dropdown [NEW]
│   │   └── Risk Badge [NEW]
│   ├── Amount Input (crypto, not INR) [MODIFIED]
│   └── INR Equivalent Display [MODIFIED]
├── Duration Selector (existing)
├── Loan Summary Card [MODIFIED]
│   ├── Requested Amount
│   ├── Collateral Required [NEW]
│   ├── Repayment Term
│   ├── Liquidation Threshold [NEW]
│   ├── Daily Rate
│   ├── Est. Interest
│   └── Est. Total Repayment
└── Credit Tiers Info (existing)
```

## Implementation Details

### Crypto Selector Component

```typescript
// Inline component in page.tsx

<div>
  <label className="...">Loan Amount</label>
  <div className="flex items-center gap-2">
    {/* Crypto Dropdown */}
    <div className="relative">
      <select
        value={selectedCrypto}
        onChange={(e) => setSelectedCrypto(e.target.value as CryptoSymbol)}
        className="..."
      >
        {Object.entries(CRYPTO_CONFIGS).map(([symbol, config]) => (
          <option key={symbol} value={symbol}>
            {symbol}
          </option>
        ))}
      </select>
      
      {/* Risk Badge */}
      <div className={`absolute -top-2 -right-2 text-xs px-2 py-0.5 rounded-full ${RISK_COLORS[CRYPTO_CONFIGS[selectedCrypto].riskCategory]}`}>
        {RISK_LABELS[CRYPTO_CONFIGS[selectedCrypto].riskCategory]}
      </div>
    </div>
    
    {/* Amount Input */}
    <input
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      placeholder="0"
      step={getStepForCrypto(selectedCrypto)}
      className="..."
    />
  </div>
  
  {/* INR Equivalent */}
  {amount && parseFloat(amount) > 0 && (
    <p className="text-xs text-gray-500 mt-2">
      ≈ {formatINR(cryptoToINR(parseFloat(amount), selectedCrypto, cryptoPrices))}
    </p>
  )}
</div>
```

### Collateral Display

```typescript
// In Loan Summary Card

const collateralResult = amount && parseFloat(amount) > 0
  ? calculateCollateral(
      parseFloat(amount),
      selectedCrypto,
      creditScore,
      getCryptoPrice(selectedCrypto, cryptoPrices)
    )
  : null;

// Display
{collateralResult && (
  <>
    <div className="flex justify-between items-center py-2 border-b">
      <span className="text-sm text-gray-600 flex items-center gap-1">
        Collateral Required
        <Tooltip text="Collateral requirement varies based on asset volatility and your credit score." />
      </span>
      <span className="text-sm font-bold">
        {collateralResult.collateralAmount.toFixed(6)} {selectedCrypto}
        <span className="text-xs text-gray-500 ml-1">
          (≈ {formatINR(collateralResult.collateralINR)})
        </span>
      </span>
    </div>
    
    <div className="flex justify-between items-center py-2 border-b">
      <span className="text-sm text-gray-600 flex items-center gap-1">
        Liquidation Threshold
        <Tooltip text="Loan is liquidated if collateral value drops below 112.5% of loan value." />
      </span>
      <span className="text-sm font-bold">
        {collateralResult.liquidationThreshold.toFixed(6)} {selectedCrypto}
        <span className="text-xs text-gray-500 ml-1">
          (≈ {formatINR(collateralResult.liquidationINR)})
        </span>
      </span>
    </div>
  </>
)}
```

### Price Fetching Logic

```typescript
// In useEffect

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
    }
    setPricesLoading(false);
  };
  
  loadPrices();
  
  // Auto-refresh every 60 seconds
  const interval = setInterval(loadPrices, 60000);
  return () => clearInterval(interval);
}, []);

// Debounced amount input
const debouncedAmount = useDebounce(amount, 300);
```

### Submit Handler Modification

```typescript
const handleSubmit = async () => {
  setError("");
  
  const amountNum = parseFloat(amount);
  if (!amount || amountNum <= 0) {
    setError("Enter a valid loan amount.");
    return;
  }
  
  // Convert crypto amount to ETH for backend
  const amountETH = cryptoToETH(
    amountNum,
    selectedCrypto,
    cryptoPrices,
    ethPrice
  );
  
  // Validate against max borrow (in INR)
  const amountINR = cryptoToINR(amountNum, selectedCrypto, cryptoPrices);
  const availableLiquidityINR = ethToINR(availableLiquidity, ethPrice);
  const maxBorrowINR = availableLiquidityINR * maxLTV;
  
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
    
    // Backend receives ETH amount (unchanged)
    await borrowFromPool(user.id, amountETH, selectedDays);
    router.push("/dashboard");
  } catch (err: unknown) {
    setError(err instanceof Error ? err.message : "Failed to borrow from pool.");
  }
  setLoading(false);
};
```

## Helper Components

### Tooltip Component

```typescript
// components/Tooltip.tsx

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center"
      >
        ?
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 z-10">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
```

### useDebounce Hook

```typescript
// hooks/useDebounce.ts

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
```

## File Structure

```
frontend/
├── app/
│   └── request-loan/
│       └── page.tsx [MODIFIED - main implementation]
├── components/
│   └── Tooltip.tsx [NEW]
├── hooks/
│   └── useDebounce.ts [NEW]
└── utils/
    ├── cryptoConfig.ts [NEW]
    ├── cryptoPriceService.ts [NEW]
    ├── collateralCalculator.ts [NEW]
    └── cryptoConverter.ts [NEW]
```

## Data Flow

```
User Input (Crypto Amount)
         ↓
Debounce (300ms)
         ↓
Calculate Collateral
    ↓         ↓
Crypto Price  Credit Score
         ↓
Display Results
    ↓         ↓
Collateral   Liquidation
         ↓
Submit → Convert to ETH → Backend
```

## Error Handling

### API Failure Scenarios

1. **CoinGecko Down**
   - Use cached prices
   - Show warning: "Using cached prices (updated X seconds ago)"
   - Disable submit if prices too old (> 5 minutes)

2. **Rate Limited**
   - Extend cache duration
   - Show: "Price updates temporarily limited"
   - Continue with cached data

3. **Network Error**
   - Retry with exponential backoff
   - Fall back to cached prices
   - Show error message with retry button

### Input Validation

```typescript
function validateInput(
  amount: string,
  selectedCrypto: CryptoSymbol,
  cryptoPrices: Record<CryptoSymbol, number>
): string | null {
  const num = parseFloat(amount);
  
  if (isNaN(num) || num <= 0) {
    return "Enter a valid amount";
  }
  
  if (num < 0.000001) {
    return "Amount too small";
  }
  
  const price = getCryptoPrice(selectedCrypto, cryptoPrices);
  if (price === 0) {
    return "Price unavailable for this crypto";
  }
  
  return null;
}
```

## Performance Optimizations

### 1. Memoization

```typescript
const collateralResult = useMemo(() => {
  if (!amount || parseFloat(amount) <= 0) return null;
  return calculateCollateral(
    parseFloat(amount),
    selectedCrypto,
    creditScore,
    getCryptoPrice(selectedCrypto, cryptoPrices)
  );
}, [amount, selectedCrypto, creditScore, cryptoPrices]);
```

### 2. Debouncing

```typescript
const debouncedAmount = useDebounce(amount, 300);
// Use debouncedAmount for calculations
```

### 3. Price Caching

- Cache duration: 10 seconds
- Auto-refresh: 60 seconds
- Deduplicate concurrent requests

## Testing Strategy

### Unit Tests

```typescript
// collateralCalculator.test.ts

describe('calculateCollateral', () => {
  it('calculates standard coin collateral correctly', () => {
    const result = calculateCollateral(1, 'ETH', 500, 100000);
    expect(result.collateralPercentage).toBe(120);
    expect(result.collateralAmount).toBe(1.2);
  });
  
  it('calculates stablecoin collateral with discount', () => {
    const result = calculateCollateral(1, 'USDC', 500, 83);
    expect(result.collateralPercentage).toBe(117.5);
  });
  
  it('calculates memecoin collateral with premium', () => {
    const result = calculateCollateral(1, 'DOGE', 500, 10);
    expect(result.collateralPercentage).toBe(125);
  });
  
  it('calculates liquidation threshold at 112.5%', () => {
    const result = calculateCollateral(1, 'ETH', 500, 100000);
    expect(result.liquidationThreshold).toBe(1.125);
  });
});
```

### Integration Tests

- Test crypto selector changes
- Test amount input with different cryptos
- Test collateral calculation updates
- Test price fetching and caching
- Test error handling

## Migration Path

### Phase 1: Add Utilities
1. Create `cryptoConfig.ts`
2. Create `cryptoPriceService.ts`
3. Create `collateralCalculator.ts`
4. Create `cryptoConverter.ts`

### Phase 2: Add Components
1. Create `Tooltip.tsx`
2. Create `useDebounce.ts` hook

### Phase 3: Modify Page
1. Add new state variables
2. Add price fetching logic
3. Replace INR input with crypto selector
4. Add collateral display
5. Add liquidation threshold display
6. Update submit handler

### Phase 4: Testing
1. Test all 10 cryptos
2. Test all credit score ranges
3. Test API failures
4. Test edge cases

## Backwards Compatibility

- Backend continues to receive ETH amounts
- No database changes required
- Existing loans unaffected
- Can be deployed independently

## Security Considerations

- Validate all user inputs
- Sanitize API responses
- Prevent XSS in tooltips
- Rate limit API calls
- Handle malicious price data

## Accessibility

- Keyboard navigation for dropdown
- ARIA labels for tooltips
- Screen reader support
- High contrast mode support
- Focus indicators

## Mobile Responsiveness

- Dropdown works on touch devices
- Tooltips work on mobile (tap to show)
- Proper spacing on small screens
- Readable font sizes
- Touch-friendly buttons

## Success Criteria

✅ All 10 cryptos selectable
✅ Collateral calculated correctly
✅ Liquidation threshold accurate
✅ Prices update within 10s
✅ No console errors
✅ Mobile responsive
✅ Tooltips functional
✅ Risk badges visible
✅ Backend unchanged
✅ Existing functionality preserved
