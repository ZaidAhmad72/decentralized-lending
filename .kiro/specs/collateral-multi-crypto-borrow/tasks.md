# Implementation Tasks: Collateral & Multi-Crypto Borrowing

## Task 1: Create Utility Files

### 1.1 Create Crypto Configuration
- [ ] Create `frontend/utils/cryptoConfig.ts`
- [ ] Define `CryptoSymbol` type (10 cryptos)
- [ ] Define `RiskCategory` type (stablecoin, standard, memecoin)
- [ ] Define `CryptoConfig` interface
- [ ] Create `CRYPTO_CONFIGS` object with all 10 cryptos
- [ ] Add CoinGecko ID mapping
- [ ] Add risk category for each crypto
- [ ] Add decimal places for each crypto
- [ ] Create `RISK_LABELS` mapping
- [ ] Create `RISK_COLORS` mapping (with dark mode support)

### 1.2 Create Collateral Calculator
- [ ] Create `frontend/utils/collateralCalculator.ts`
- [ ] Define `CollateralResult` interface
- [ ] Implement `calculateCollateral()` function
- [ ] Implement `getCollateralPercentage()` helper
- [ ] Create standard coins collateral table
- [ ] Create stablecoins collateral table (Standard - 2.5%)
- [ ] Create memecoins collateral table (higher)
- [ ] Implement credit score tier logic (new, low, medium, high, excellent)
- [ ] Calculate collateral amount (loan × percentage)
- [ ] Calculate liquidation threshold (loan × 1.125)
- [ ] Add TypeScript types for all functions

### 1.3 Create Crypto Price Service
- [ ] Create `frontend/utils/cryptoPriceService.ts`
- [ ] Define `PriceCache` interface
- [ ] Define `PriceFetchResult` interface
- [ ] Implement `fetchCryptoPrices()` with caching
- [ ] Add 10-second cache duration
- [ ] Implement request deduplication
- [ ] Implement `fetchPricesFromAPI()` helper
- [ ] Build CoinGecko API URL with all crypto IDs
- [ ] Parse API response and map to our structure
- [ ] Handle API errors gracefully
- [ ] Return cached prices on API failure
- [ ] Implement `getCryptoPrice()` helper
- [ ] Implement `cryptoToINR()` converter
- [ ] Implement `inrToCrypto()` converter

### 1.4 Create Crypto Converter
- [ ] Create `frontend/utils/cryptoConverter.ts`
- [ ] Implement `cryptoToETH()` function (for backend compatibility)
- [ ] Implement `ethToCrypto()` function (for display)
- [ ] Add proper decimal handling
- [ ] Add zero-division protection

## Task 2: Create Helper Components

### 2.1 Create Tooltip Component
- [ ] Create `frontend/components/Tooltip.tsx`
- [ ] Add hover state management
- [ ] Implement tooltip positioning (bottom-center)
- [ ] Add dark mode support
- [ ] Add arrow pointer
- [ ] Make mobile-friendly (tap to show)
- [ ] Add ARIA labels for accessibility
- [ ] Style with existing design system

### 2.2 Create useDebounce Hook
- [ ] Create `frontend/hooks/useDebounce.ts`
- [ ] Implement debounce logic with setTimeout
- [ ] Add cleanup on unmount
- [ ] Add TypeScript generics
- [ ] Set default delay to 300ms

## Task 3: Modify Request Loan Page

### 3.1 Add New State Variables
- [ ] Open `frontend/app/request-loan/page.tsx`
- [ ] Add `selectedCrypto` state (default: 'ETH')
- [ ] Add `cryptoPrices` state (Record<CryptoSymbol, number>)
- [ ] Add `pricesLoading` state (boolean)
- [ ] Add `pricesCached` state (boolean)
- [ ] Add `priceError` state (string | null)
- [ ] Add `lastPriceUpdate` state (number)

### 3.2 Add Price Fetching Logic
- [ ] Import `fetchCryptoPrices` from cryptoPriceService
- [ ] Create `loadPrices` async function
- [ ] Call `fetchCryptoPrices()` in useEffect
- [ ] Update state with prices
- [ ] Handle loading state
- [ ] Handle error state
- [ ] Set up auto-refresh interval (60 seconds)
- [ ] Clean up interval on unmount

### 3.3 Replace INR Input with Crypto Selector
- [ ] Remove "Loan Amount (₹)" label
- [ ] Add "Loan Amount" label
- [ ] Create crypto dropdown select
- [ ] Map all 10 cryptos to options
- [ ] Add onChange handler to update selectedCrypto
- [ ] Style dropdown to match existing design
- [ ] Add dark mode support
- [ ] Position risk badge near dropdown

### 3.4 Add Risk Badge
- [ ] Get risk category from CRYPTO_CONFIGS
- [ ] Display risk label (Low/Standard/High Risk)
- [ ] Apply color based on risk category
- [ ] Position badge (top-right of dropdown)
- [ ] Add dark mode colors
- [ ] Make responsive on mobile

### 3.5 Modify Amount Input
- [ ] Change input to accept crypto amount (not INR)
- [ ] Update placeholder to match crypto decimals
- [ ] Add dynamic step based on crypto (e.g., 0.01 for BTC, 1 for USDC)
- [ ] Remove ₹ symbol from input
- [ ] Keep existing styling

### 3.6 Add INR Equivalent Display
- [ ] Calculate INR value using cryptoToINR()
- [ ] Display below input: "≈ ₹X,XXX"
- [ ] Show only when amount > 0
- [ ] Update on amount or crypto change
- [ ] Format INR with existing formatINR()

### 3.7 Update Max Button Logic
- [ ] Calculate max borrow in selected crypto
- [ ] Convert maxBorrowINR to selected crypto
- [ ] Update button to set crypto amount
- [ ] Update button label to show crypto symbol

### 3.8 Add Collateral Display in Loan Summary
- [ ] Import calculateCollateral from collateralCalculator
- [ ] Calculate collateral result using useMemo
- [ ] Add "Collateral Required" row
- [ ] Display crypto amount with proper decimals
- [ ] Display INR equivalent in parentheses
- [ ] Add Tooltip component with collateral explanation
- [ ] Position below "Requested Amount"
- [ ] Style to match existing rows

### 3.9 Add Liquidation Threshold Display
- [ ] Use liquidation data from collateral result
- [ ] Add "Liquidation Threshold" row
- [ ] Display crypto amount with proper decimals
- [ ] Display INR equivalent in parentheses
- [ ] Add Tooltip component with liquidation explanation
- [ ] Position below "Collateral Required"
- [ ] Style to match existing rows

### 3.10 Update Loan Summary Values
- [ ] Update "Requested Amount" to show crypto + INR
- [ ] Update "Est. Total Interest" calculation (use INR)
- [ ] Update "Est. Total Repayment" to show crypto + INR
- [ ] Keep "Exchange Rate" but update to show selected crypto
- [ ] Format all values consistently

### 3.11 Update Submit Handler
- [ ] Get crypto amount from input
- [ ] Convert crypto to ETH using cryptoToETH()
- [ ] Validate amount > 0
- [ ] Calculate amountINR for validation
- [ ] Validate against maxBorrowINR
- [ ] Update error messages to show crypto symbol
- [ ] Pass ETH amount to borrowFromPool() (unchanged backend)
- [ ] Keep existing error handling

### 3.12 Add Price Status Indicator
- [ ] Show "Prices updated X seconds ago" below summary
- [ ] Show "Using cached prices" if cached
- [ ] Show "Loading prices..." if loading
- [ ] Show error message if price fetch failed
- [ ] Add manual refresh button
- [ ] Style as small text below loan summary

## Task 4: Add Tooltips

### 4.1 Collateral Tooltip
- [ ] Add Tooltip to "Collateral Required" label
- [ ] Set text: "Collateral requirement varies based on asset volatility and your credit score. Higher volatility assets require higher collateral."
- [ ] Test hover behavior
- [ ] Test mobile tap behavior

### 4.2 Liquidation Tooltip
- [ ] Add Tooltip to "Liquidation Threshold" label
- [ ] Set text: "Loan is liquidated if collateral value drops below 112.5% of loan value."
- [ ] Test hover behavior
- [ ] Test mobile tap behavior

### 4.3 Risk Badge Tooltips (Optional)
- [ ] Add tooltip to Low Risk badge: "Stablecoins have minimal price volatility"
- [ ] Add tooltip to Standard Risk badge: "Established cryptocurrencies with moderate volatility"
- [ ] Add tooltip to High Risk badge: "Memecoins have high price volatility"

## Task 5: Testing & Validation

### 5.1 Unit Tests
- [ ] Test collateralCalculator with all credit scores
- [ ] Test collateralCalculator with all risk categories
- [ ] Test cryptoPriceService caching
- [ ] Test cryptoConverter conversions
- [ ] Test edge cases (zero, negative, very small values)

### 5.2 Integration Tests
- [ ] Test selecting each of 10 cryptos
- [ ] Test amount input with different cryptos
- [ ] Test collateral calculation updates
- [ ] Test liquidation threshold updates
- [ ] Test price fetching and caching
- [ ] Test API failure handling
- [ ] Test switching cryptos mid-input
- [ ] Test max button with different cryptos

### 5.3 UI/UX Tests
- [ ] Test on desktop (Chrome, Firefox, Safari)
- [ ] Test on mobile (iOS Safari, Android Chrome)
- [ ] Test dark mode
- [ ] Test tooltips on hover
- [ ] Test tooltips on mobile tap
- [ ] Test dropdown keyboard navigation
- [ ] Test screen reader compatibility
- [ ] Test with very long numbers
- [ ] Test with very small numbers

### 5.4 Edge Case Tests
- [ ] Test with API down (use cached prices)
- [ ] Test with rate limiting (extend cache)
- [ ] Test with zero amount
- [ ] Test with empty input
- [ ] Test with invalid input
- [ ] Test switching crypto with amount entered
- [ ] Test with credit score = 500 (new user)
- [ ] Test with credit score < 500
- [ ] Test with credit score > 900

### 5.5 Performance Tests
- [ ] Verify price caching works (10s duration)
- [ ] Verify debouncing works (300ms delay)
- [ ] Verify no API spam
- [ ] Verify smooth UI updates
- [ ] Check for memory leaks
- [ ] Check bundle size impact

## Task 6: Documentation & Cleanup

### 6.1 Code Documentation
- [ ] Add JSDoc comments to all utility functions
- [ ] Add inline comments for complex calculations
- [ ] Document collateral percentage tables
- [ ] Document API endpoints and responses

### 6.2 User Documentation
- [ ] Update README with new features
- [ ] Add screenshots of new UI
- [ ] Document supported cryptocurrencies
- [ ] Explain collateral requirements
- [ ] Explain liquidation thresholds

### 6.3 Code Cleanup
- [ ] Remove console.logs
- [ ] Remove unused imports
- [ ] Format code with Prettier
- [ ] Run ESLint and fix warnings
- [ ] Check TypeScript strict mode

## Task 7: Final Validation

### 7.1 Acceptance Criteria Checklist
- [ ] All 10 cryptos selectable from dropdown
- [ ] Collateral displays correctly for each risk category
- [ ] Liquidation threshold shows 112.5% of loan
- [ ] Prices fetch from CoinGecko successfully
- [ ] Prices cache for 10 seconds
- [ ] Risk badges show correct colors
- [ ] Tooltips appear on hover/tap
- [ ] Mobile layout works correctly
- [ ] Error handling works for API failures
- [ ] Switching cryptos recalculates everything
- [ ] Empty input shows placeholders
- [ ] Max button works with new crypto selector
- [ ] Credit score affects collateral correctly
- [ ] All INR conversions accurate
- [ ] No console errors or warnings

### 7.2 Backend Compatibility
- [ ] Verify backend still receives ETH amounts
- [ ] Verify existing loans unaffected
- [ ] Verify no database changes needed
- [ ] Verify no API changes needed

### 7.3 Regression Testing
- [ ] Verify existing borrow flow still works
- [ ] Verify credit score display unchanged
- [ ] Verify duration selector unchanged
- [ ] Verify error messages still work
- [ ] Verify navigation still works
- [ ] Verify dark mode still works
- [ ] Verify mobile navbar still works

## Task 8: Deployment Preparation

### 8.1 Environment Setup
- [ ] Verify no new environment variables needed
- [ ] Verify CoinGecko API works without API key
- [ ] Test on staging environment
- [ ] Verify production build works

### 8.2 Rollout Plan
- [ ] Deploy to staging
- [ ] Test all features on staging
- [ ] Get user feedback
- [ ] Fix any issues
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Monitor API usage

## Notes

- **No backend changes required** - All logic is frontend-only
- **Backend compatibility** - Backend continues to receive ETH amounts
- **Graceful degradation** - App works even if price API fails
- **Performance** - Caching and debouncing prevent API spam
- **Accessibility** - Tooltips and keyboard navigation supported
- **Mobile-first** - Responsive design for all screen sizes

## Estimated Time

- Task 1 (Utilities): 4 hours
- Task 2 (Components): 2 hours
- Task 3 (Page Modifications): 6 hours
- Task 4 (Tooltips): 1 hour
- Task 5 (Testing): 4 hours
- Task 6 (Documentation): 2 hours
- Task 7 (Validation): 2 hours
- Task 8 (Deployment): 1 hour

**Total: ~22 hours**

## Dependencies

- Existing `getEthPrice.ts` utility (reference)
- Existing `formatINR()` function
- Existing UI components and styling
- CoinGecko API (free tier)
- No new npm packages required
