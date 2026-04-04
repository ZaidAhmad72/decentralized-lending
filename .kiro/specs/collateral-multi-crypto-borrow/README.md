# Collateral & Multi-Crypto Borrowing Feature

## Overview

This spec extends the existing DeFi borrow page to support multi-cryptocurrency borrowing with risk-based collateral requirements and liquidation thresholds - all implemented as frontend-only features without modifying backend logic.

## Quick Links

- [Requirements](./requirements.md) - User stories, functional requirements, acceptance criteria
- [Design](./design.md) - Technical architecture, data structures, implementation details
- [Tasks](./tasks.md) - Step-by-step implementation checklist

## Feature Summary

### What's Being Added

1. **Multi-Crypto Borrowing** - Support for 10 cryptocurrencies (USDC, USDT, BTC, ETH, BNB, SOL, XRP, DOGE, PEPE, BONK)
2. **Risk-Based Collateral** - Different collateral requirements based on asset volatility
3. **Liquidation Thresholds** - Display when loans would be liquidated (112.5% rule)
4. **Live Price Conversion** - Real-time crypto prices from CoinGecko API
5. **Risk Badges** - Visual indicators for asset risk categories
6. **Tooltips** - Helpful explanations for collateral and liquidation

### What's NOT Changing

- ❌ Backend logic (no modifications)
- ❌ Smart contracts (no changes)
- ❌ Database schema (no changes)
- ❌ API endpoints (no changes)
- ❌ Existing UI styling (only extensions)

## Key Features

### 1. Crypto Risk Categories

**Stablecoins (Low Risk - Lower Collateral):**
- USDC, USDT
- Collateral: 115-122.5%

**Standard Coins (Medium Risk - Standard Collateral):**
- BTC, ETH, BNB, SOL, XRP
- Collateral: 117.5-125%

**Memecoins (High Risk - Higher Collateral):**
- DOGE, PEPE, BONK
- Collateral: 120-130%

### 2. Collateral Calculation

```
Collateral = Loan Amount × Collateral Percentage

Example:
- Loan: 0.05 ETH (₹5,000)
- Credit Score: 500
- Crypto: ETH (Standard)
- Collateral: 0.05 × 1.20 = 0.06 ETH (₹6,000)
```

### 3. Liquidation Threshold

```
Liquidation Threshold = Loan Amount × 1.125

Example:
- Loan: 0.05 ETH (₹5,000)
- Liquidation: 0.05 × 1.125 = 0.05625 ETH (₹5,625)
```

## UI Changes

### Before (Current)
```
Loan Amount (₹)
₹ 5000
≈ 0.026169 ETH
```

### After (New)
```
Loan Amount
[ETH ▼] 0.026169  [Standard Risk]
≈ ₹5000

Loan Summary:
- Requested Amount: 0.026169 ETH (₹5000)
- Collateral Required: 0.031 ETH (≈ ₹6000) [NEW]
- Repayment Term: 30 Days
- Liquidation Threshold: 0.029 ETH (≈ ₹5625) [NEW]
- Daily Rate: 0.024%
- Est. Total Interest: ₹36
- Est. Total Repayment: 0.026289 ETH (₹5036)
```

## Technical Architecture

### New Files

```
frontend/
├── utils/
│   ├── cryptoConfig.ts          [NEW] - Crypto definitions & risk categories
│   ├── collateralCalculator.ts  [NEW] - Collateral calculation logic
│   ├── cryptoPriceService.ts    [NEW] - Price fetching & caching
│   └── cryptoConverter.ts       [NEW] - Crypto ↔ ETH conversion
├── components/
│   └── Tooltip.tsx              [NEW] - Tooltip component
└── hooks/
    └── useDebounce.ts           [NEW] - Debounce hook
```

### Modified Files

```
frontend/
└── app/
    └── request-loan/
        └── page.tsx             [MODIFIED] - Main implementation
```

## Implementation Approach

### Phase 1: Utilities (4 hours)
- Create crypto configuration
- Implement collateral calculator
- Build price service with caching
- Add crypto converters

### Phase 2: Components (2 hours)
- Create tooltip component
- Add debounce hook

### Phase 3: Page Modifications (6 hours)
- Add crypto selector dropdown
- Replace INR input with crypto input
- Add collateral display
- Add liquidation threshold
- Update submit handler

### Phase 4: Testing (4 hours)
- Unit tests for calculations
- Integration tests for UI
- Edge case testing
- Performance validation

### Phase 5: Documentation (2 hours)
- Code documentation
- User guide updates
- API documentation

**Total Estimated Time: ~22 hours**

## Key Design Decisions

### 1. Frontend-Only Implementation
- All calculations happen in browser
- Backend receives ETH amounts (unchanged)
- No database changes required
- Can be deployed independently

### 2. Price Caching Strategy
- Cache duration: 10 seconds
- Auto-refresh: 60 seconds
- Graceful degradation on API failure
- Request deduplication

### 3. Collateral Calculation
- Based on credit score + risk category
- Stablecoins get 2.5% discount
- Memecoins get 2.5-5% premium
- Liquidation always at 112.5%

### 4. User Experience
- Crypto-first input (not INR)
- Live price conversion
- Clear risk indicators
- Helpful tooltips
- Mobile-responsive

## Success Metrics

- ✅ All 10 cryptos selectable
- ✅ Collateral calculated correctly
- ✅ Prices update within 10 seconds
- ✅ No console errors
- ✅ Mobile responsive
- ✅ Backend unchanged
- ✅ Existing functionality preserved

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| CoinGecko rate limiting | Implement caching & debouncing |
| Price volatility | Show "prices update every 10s" notice |
| User confusion | Clear tooltips & visual indicators |
| API downtime | Use cached prices, show warning |

## Testing Strategy

### Unit Tests
- Collateral calculation for all scenarios
- Price service caching logic
- Crypto conversion accuracy

### Integration Tests
- Crypto selector functionality
- Amount input with different cryptos
- Price fetching and updates
- Error handling

### UI/UX Tests
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile devices (iOS, Android)
- Dark mode
- Tooltips
- Keyboard navigation

### Edge Cases
- API failures
- Zero/empty values
- Very small amounts
- Switching cryptos mid-input

## Deployment Plan

1. **Staging Deployment**
   - Deploy to staging environment
   - Test all features
   - Get user feedback

2. **Production Deployment**
   - Deploy during low-traffic period
   - Monitor for errors
   - Monitor API usage
   - Be ready to rollback

3. **Post-Deployment**
   - Monitor user adoption
   - Track API performance
   - Gather feedback
   - Plan improvements

## Future Enhancements (Out of Scope)

- ❌ Backend collateral tracking
- ❌ Actual liquidation implementation
- ❌ Multi-collateral support
- ❌ Historical price charts
- ❌ Price alerts
- ❌ Collateral deposit/withdrawal

## Questions & Answers

**Q: Does this change the backend?**
A: No, backend continues to receive ETH amounts. All conversions happen in frontend.

**Q: What if CoinGecko API is down?**
A: App uses cached prices and shows a warning. Users can still borrow with last known prices.

**Q: Can users provide collateral in a different crypto?**
A: No, collateral must match the borrowed asset (same crypto).

**Q: How often do prices update?**
A: Prices are cached for 10 seconds and auto-refresh every 60 seconds.

**Q: Does this affect existing loans?**
A: No, existing loans are unaffected. This only changes the borrow page UI.

## Getting Started

1. Read [Requirements](./requirements.md) to understand what's being built
2. Review [Design](./design.md) for technical details
3. Follow [Tasks](./tasks.md) for step-by-step implementation
4. Test thoroughly before deployment

## Status

- [x] Requirements documented
- [x] Design completed
- [x] Tasks defined
- [ ] Implementation started
- [ ] Testing completed
- [ ] Deployed to staging
- [ ] Deployed to production

## Contact

For questions or clarifications about this spec, please refer to the detailed documentation in the linked files above.
