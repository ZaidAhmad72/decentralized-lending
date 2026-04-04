# Testing Guide

## Quick Start Testing

### 1. Start Development Server
```bash
cd frontend
npm run dev
```

### 2. Navigate to Borrow Page
- Login to your account
- Go to "Borrow from Pool" page
- URL: `http://localhost:3000/request-loan`

## Feature Testing

### Test 1: Crypto Selector
**Steps:**
1. Click on crypto dropdown
2. Select each crypto one by one
3. Verify risk badge changes color

**Expected:**
- USDC/USDT → Green badge "Low Risk"
- BTC/ETH/BNB/SOL/XRP → Yellow badge "Standard Risk"
- DOGE/PEPE/BONK → Red badge "High Risk"

### Test 2: Amount Input
**Steps:**
1. Select ETH
2. Enter amount: 0.05
3. Verify INR equivalent shows below
4. Switch to USDC
5. Verify amount stays, INR updates

**Expected:**
- INR conversion updates automatically
- Decimal places appropriate for crypto
- No console errors

### Test 3: Collateral Display
**Steps:**
1. Select ETH (Standard Risk)
2. Enter amount: 0.05
3. Check "Collateral Required" in Loan Summary

**Expected:**
- Shows collateral in ETH
- Shows INR equivalent in parentheses
- Tooltip appears on hover
- Collateral = 0.05 × 1.20 = 0.06 ETH (for credit score 500)

### Test 4: Liquidation Threshold
**Steps:**
1. Enter any amount
2. Check "Liquidation Threshold" in Loan Summary

**Expected:**
- Shows threshold in crypto
- Shows INR equivalent
- Threshold = amount × 1.125
- Tooltip explains liquidation

### Test 5: Risk-Based Collateral
**Test with different cryptos:**

| Crypto | Risk | Credit Score 500 | Expected Collateral |
|--------|------|------------------|---------------------|
| USDC | Low | 500 | 117.5% |
| ETH | Standard | 500 | 120% |
| DOGE | High | 500 | 125% |

**Steps:**
1. Enter 1 unit of each crypto
2. Verify collateral percentage matches table

### Test 6: Max Button
**Steps:**
1. Select different cryptos
2. Click "Max" button
3. Verify amount fills with max borrow in that crypto

**Expected:**
- Max calculated correctly for each crypto
- Amount respects credit limit
- INR equivalent matches

### Test 7: Price Caching
**Steps:**
1. Load page (prices fetch)
2. Wait 5 seconds
3. Change amount (should use cached prices)
4. Wait 15 seconds
5. Change amount (should fetch new prices)

**Expected:**
- "Prices updated just now" initially
- "Using cached prices (Xs ago)" after delay
- Auto-refresh every 60 seconds

### Test 8: API Failure Handling
**Steps:**
1. Disconnect internet
2. Reload page
3. Try to borrow

**Expected:**
- Shows "Using cached prices (API unavailable)"
- Can still borrow with cached prices
- No crashes

### Test 9: Dark Mode
**Steps:**
1. Toggle dark mode
2. Check all components

**Expected:**
- Crypto dropdown readable
- Risk badges visible
- Tooltips visible
- Loan summary readable
- No white-on-white text

### Test 10: Mobile Responsive
**Steps:**
1. Open on mobile device or resize browser
2. Test all features

**Expected:**
- Crypto dropdown works
- Amount input usable
- Tooltips work on tap
- Risk badge visible
- Loan summary readable

## Collateral Calculation Tests

### Test Credit Score Tiers

**Standard Coins (ETH):**
| Credit Score | Expected Collateral |
|--------------|---------------------|
| 500 (new) | 120% |
| 450 | 125% |
| 650 | 120% |
| 850 | 118.5% |
| 950 | 117.5% |

**Stablecoins (USDC):**
| Credit Score | Expected Collateral |
|--------------|---------------------|
| 500 | 117.5% |
| 450 | 122.5% |
| 650 | 117.5% |
| 850 | 116% |
| 950 | 115% |

**Memecoins (DOGE):**
| Credit Score | Expected Collateral |
|--------------|---------------------|
| 500 | 125% |
| 450 | 130% |
| 650 | 125% |
| 850 | 122.5% |
| 950 | 120% |

## Edge Case Tests

### Test 1: Zero Amount
**Steps:**
1. Leave amount empty
2. Try to submit

**Expected:**
- Error: "Enter a valid loan amount."
- Submit button disabled

### Test 2: Very Small Amount
**Steps:**
1. Enter 0.000001 BTC
2. Check calculations

**Expected:**
- Displays correctly
- Collateral calculates
- INR shows properly

### Test 3: Very Large Amount
**Steps:**
1. Enter amount > max borrow
2. Try to submit

**Expected:**
- Error: "Amount exceeds your credit limit..."
- Shows max limit

### Test 4: Switching Crypto Mid-Input
**Steps:**
1. Select ETH, enter 0.05
2. Switch to USDC
3. Verify calculations update

**Expected:**
- Amount stays same
- INR equivalent updates
- Collateral recalculates
- Liquidation updates

### Test 5: Price = 0
**Steps:**
1. If any crypto has price = 0
2. Try to borrow

**Expected:**
- Submit button disabled
- Error message shown

## Integration Tests

### Test 1: Full Borrow Flow
**Steps:**
1. Select USDC
2. Enter 1000 USDC
3. Select 30 days
4. Review loan summary
5. Click "Borrow from Pool"

**Expected:**
- Converts USDC → ETH for backend
- Loan created successfully
- Redirects to dashboard
- No errors

### Test 2: Multiple Cryptos
**Steps:**
1. Borrow ETH, repay
2. Borrow USDC, repay
3. Borrow DOGE, repay

**Expected:**
- All work correctly
- Backend receives ETH amounts
- Credit score updates

## Performance Tests

### Test 1: Price Fetch Speed
**Expected:**
- Initial fetch < 500ms
- Cached reads < 10ms
- No blocking

### Test 2: Calculation Speed
**Expected:**
- Collateral calculation instant
- No lag when typing
- Smooth UI updates

### Test 3: Memory Leaks
**Steps:**
1. Switch cryptos 50 times
2. Enter/clear amount 50 times
3. Check browser memory

**Expected:**
- No memory growth
- No console warnings

## Accessibility Tests

### Test 1: Keyboard Navigation
**Steps:**
1. Tab through all inputs
2. Use arrow keys in dropdown
3. Press Enter to submit

**Expected:**
- All focusable
- Visual focus indicators
- Dropdown navigable

### Test 2: Screen Reader
**Steps:**
1. Enable screen reader
2. Navigate page

**Expected:**
- Labels read correctly
- Tooltips have ARIA labels
- Values announced

## Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

## Checklist

### Functionality
- [ ] All 10 cryptos selectable
- [ ] Risk badges show correct colors
- [ ] Collateral calculates correctly
- [ ] Liquidation threshold at 112.5%
- [ ] Prices fetch from CoinGecko
- [ ] Prices cache for 10 seconds
- [ ] Max button works
- [ ] Submit converts to ETH
- [ ] Tooltips work

### UI/UX
- [ ] Dark mode works
- [ ] Mobile responsive
- [ ] Tooltips visible
- [ ] No white-on-white text
- [ ] Loading states show
- [ ] Error messages clear

### Performance
- [ ] No console errors
- [ ] No console warnings
- [ ] Fast price fetching
- [ ] Smooth UI updates
- [ ] No memory leaks

### Edge Cases
- [ ] Zero amount handled
- [ ] Empty input handled
- [ ] API failure handled
- [ ] Switching crypto works
- [ ] Very small amounts work
- [ ] Very large amounts blocked

## Bug Reporting

If you find issues, report with:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/device
5. Console errors (if any)
6. Screenshots

## Success Criteria

✅ All tests pass
✅ No console errors
✅ Mobile works
✅ Dark mode works
✅ Backend unchanged
✅ Existing features work

---

**Ready for Production:** After all tests pass ✅
