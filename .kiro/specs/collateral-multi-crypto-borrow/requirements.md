# Requirements: Collateral & Multi-Crypto Borrowing

## Feature Overview

Extend the existing borrow page to support multi-cryptocurrency borrowing with risk-based collateral requirements, liquidation thresholds, and live price conversion - all implemented as frontend-only calculations without modifying backend logic.

## Hard Constraints

- ✅ **NO backend logic changes** - All calculations happen in frontend
- ✅ **NO smart contract modifications** - Pure UI extension
- ✅ **NO architecture refactoring** - Maintain current structure
- ✅ **Maintain existing UI styling** - Extend, don't redesign

## User Stories

### US-1: View Collateral Requirements
**As a** borrower  
**I want to** see the collateral required for my loan  
**So that** I understand what assets I need to lock up

**Acceptance Criteria:**
- Collateral amount displayed in Loan Summary card
- Positioned below "Requested Amount" and above "Repayment Term"
- Shows both crypto amount and INR equivalent
- Updates dynamically when loan amount or crypto changes

### US-2: Borrow Different Cryptocurrencies
**As a** borrower  
**I want to** choose which cryptocurrency to borrow  
**So that** I can get the asset I need

**Acceptance Criteria:**
- Dropdown selector with 10 supported cryptos
- Input shows crypto amount (not INR)
- INR equivalent shown below input
- Supported cryptos: USDC, USDT, BTC, ETH, BNB, SOL, XRP, DOGE, PEPE, BONK

### US-3: Understand Asset Risk
**As a** borrower  
**I want to** see the risk category of each crypto  
**So that** I understand why collateral requirements differ

**Acceptance Criteria:**
- Risk badge displayed near crypto selector
- Three categories: Low Risk (green), Standard Risk (yellow), High Risk (red)
- Tooltip explains risk-based collateral
- Visual distinction between categories

### US-4: View Liquidation Threshold
**As a** borrower  
**I want to** see when my loan would be liquidated  
**So that** I can manage my risk

**Acceptance Criteria:**
- Liquidation threshold displayed in Loan Summary
- Positioned below collateral requirement
- Shows both crypto amount and INR equivalent
- Tooltip explains liquidation logic

### US-5: Get Live Price Conversion
**As a** borrower  
**I want to** see real-time crypto prices  
**So that** I know the current value of my loan

**Acceptance Criteria:**
- Prices fetched from CoinGecko API
- Prices cached for 10 seconds
- Loading state while fetching
- Graceful error handling if API fails
- Auto-refresh every 60 seconds

## Functional Requirements

### FR-1: Crypto Risk Categories

**Stablecoins (Low Risk - Lower Collateral):**
- USDC
- USDT

**Standard Coins (Medium Risk - Standard Collateral):**
- BTC
- ETH
- BNB
- SOL
- XRP

**Memecoins (High Risk - Higher Collateral):**
- DOGE
- PEPE
- BONK

### FR-2: Collateral Calculation

**Formula:**
```
Collateral = Loan Amount × Collateral Percentage
```

**Standard Coins Collateral Table:**
| Credit Score | Collateral % |
|--------------|--------------|
| New User (500) | 120% |
| < 500 | 125% |
| 500-700 | 120% |
| 700-900 | 118.5% |
| 900+ | 117.5% |

**Stablecoins Collateral (Standard - 2.5%):**
| Credit Score | Collateral % |
|--------------|--------------|
| New User (500) | 117.5% |
| < 500 | 122.5% |
| 500-700 | 117.5% |
| 700-900 | 116% |
| 900+ | 115% |

**Memecoins Collateral (Higher):**
| Credit Score | Collateral % |
|--------------|--------------|
| New User (500) | 125% |
| < 500 | 130% |
| 500-700 | 125% |
| 700-900 | 122.5% |
| 900+ | 120% |

### FR-3: Liquidation Threshold

**Formula:**
```
Liquidation Threshold = Loan Amount × 1.125 (112.5%)
```

**Liquidation Trigger:**
```
Liquidation occurs when: Collateral Value / Loan Value < 1.125
```

### FR-4: Price API Integration

**API:** CoinGecko Free API  
**Endpoint:** `https://api.coingecko.com/api/v3/simple/price`

**Symbol Mapping:**
| Crypto | CoinGecko ID |
|--------|--------------|
| USDC | usd-coin |
| USDT | tether |
| BTC | bitcoin |
| ETH | ethereum |
| BNB | binancecoin |
| SOL | solana |
| XRP | ripple |
| DOGE | dogecoin |
| PEPE | pepe |
| BONK | bonk |

**Caching Strategy:**
- Cache prices for 10 seconds
- Debounce input changes (300ms)
- Prevent API spam
- Handle rate limiting gracefully

### FR-5: UI Layout Changes

**Before (Current):**
```
Loan Amount (₹)
₹ 5000
≈ 0.026169 ETH
```

**After (New):**
```
Loan Amount
[ETH ▼] 0.026169
≈ ₹5000
```

**Loan Summary Additions:**
```
Requested Amount: 0.026169 ETH (₹5000)
Collateral Required: 0.031 ETH (≈ ₹6000) [NEW]
Repayment Term: 30 Days
Liquidation Threshold: 0.029 ETH (≈ ₹5625) [NEW]
Daily Rate: 0.024%
Est. Total Interest: ₹36
Est. Total Repayment: 0.026289 ETH (₹5036)
```

## Non-Functional Requirements

### NFR-1: Performance
- Price fetch < 500ms
- UI updates < 100ms
- No blocking operations
- Smooth animations

### NFR-2: Reliability
- Graceful API failure handling
- Fallback to cached prices
- Error messages for users
- No crashes on edge cases

### NFR-3: Usability
- Clear visual hierarchy
- Intuitive crypto selector
- Helpful tooltips
- Responsive on mobile

### NFR-4: Maintainability
- Reusable utility functions
- Clear separation of concerns
- Well-documented calculations
- Type-safe TypeScript

## Edge Cases

### EC-1: API Failures
- **Scenario:** CoinGecko API is down
- **Handling:** Use last cached price, show warning message

### EC-2: Very Small Values
- **Scenario:** User enters 0.0001 crypto
- **Handling:** Display with appropriate decimal places, validate minimum

### EC-3: Switching Crypto Mid-Input
- **Scenario:** User enters amount, then switches crypto
- **Handling:** Recalculate all values, maintain INR equivalent if possible

### EC-4: Zero/Empty Values
- **Scenario:** User clears input
- **Handling:** Show "—" placeholders, disable borrow button

### EC-5: Rate Limiting
- **Scenario:** Too many API requests
- **Handling:** Use cached values, show "Using cached prices" message

## Out of Scope

- ❌ Backend collateral tracking
- ❌ Smart contract collateral logic
- ❌ Actual liquidation implementation
- ❌ Collateral deposit/withdrawal
- ❌ Multi-collateral support (collateral must match borrow asset)
- ❌ Historical price charts
- ❌ Price alerts

## Success Metrics

- ✅ All 10 cryptos selectable
- ✅ Collateral calculated correctly for all risk categories
- ✅ Liquidation threshold displayed accurately
- ✅ Prices update within 10 seconds
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Tooltips functional
- ✅ Risk badges visible

## Dependencies

- Existing `getEthPrice.ts` utility (reference for price fetching pattern)
- CoinGecko API (free tier, no API key required)
- Current loan service (no modifications)
- Current UI components (extend, don't replace)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| CoinGecko rate limiting | High | Implement caching, debouncing |
| Price volatility during input | Medium | Show "prices update every 10s" notice |
| User confusion about collateral | Medium | Clear tooltips, visual indicators |
| Mobile layout complexity | Low | Test on multiple screen sizes |

## Validation Rules

- Loan amount > 0
- Loan amount ≤ available liquidity × maxLTV
- Selected crypto must be in supported list
- Collateral must be in same crypto as loan
- All calculations must use correct decimal places

## Tooltips

### Collateral Tooltip:
```
Collateral requirement varies based on asset volatility and your credit score.
Higher volatility assets require higher collateral.
```

### Liquidation Tooltip:
```
Loan is liquidated if collateral value drops below 112.5% of loan value.
```

### Risk Badge Tooltips:
- **Low Risk:** "Stablecoins have minimal price volatility"
- **Standard Risk:** "Established cryptocurrencies with moderate volatility"
- **High Risk:** "Memecoins have high price volatility"

## Implementation Notes

- All calculations happen in frontend
- No database schema changes
- No API endpoint changes
- Backend continues to work with ETH amounts
- Frontend converts crypto → ETH → backend
- Display layer shows selected crypto

## Acceptance Testing Checklist

- [ ] Can select all 10 cryptos from dropdown
- [ ] Collateral displays correctly for each risk category
- [ ] Liquidation threshold shows 112.5% of loan
- [ ] Prices fetch from CoinGecko successfully
- [ ] Prices cache for 10 seconds
- [ ] Risk badges show correct colors
- [ ] Tooltips appear on hover
- [ ] Mobile layout works correctly
- [ ] Error handling works for API failures
- [ ] Switching cryptos recalculates everything
- [ ] Empty input shows placeholders
- [ ] Max button works with new crypto selector
- [ ] Credit score affects collateral correctly
- [ ] All INR conversions accurate
- [ ] No console errors or warnings
