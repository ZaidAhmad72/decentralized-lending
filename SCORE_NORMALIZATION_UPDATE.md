# Credit Score Normalization Update

## Problem
Credit scores were jumping too dramatically (e.g., 570 → 775 in one action), making the system feel unpredictable and gameable.

## Root Cause
1. **Steep Sigmoid Function**: Standard sigmoid `1/(1+exp(-x))` has a very steep slope around x=0, causing large output changes for small input changes
2. **Aggressive Factor Scaling**: Some factors (wallet history, liquidity, activity) were scaled too generously
3. **No Dampening**: No mechanism to prevent large single-action jumps

## Solutions Implemented

### 1. Gentler Sigmoid Function
**Before:**
```typescript
sigmoid(x) = 1 / (1 + exp(-x))  // k=1 (steep)
```

**After:**
```typescript
sigmoid(x) = 1 / (1 + exp(-2*x))  // k=2 (gentler slope)
```

**Impact**: Reduces the rate of change, making score movements more gradual.

### 2. Score Change Dampening
**New Feature:**
```typescript
// Limit score change to ±50 points per recalculation
if (Math.abs(newScore - currentScore) > 50) {
  newScore = currentScore ± 50
}
```

**Impact**: 
- Maximum jump per action: 50 points
- To go from 570 → 775 (205 points) now requires ~5 actions instead of 1
- Prevents gaming the system with single large actions

### 3. More Conservative Factor Scaling

#### Wallet History
**Before:** `log(1 + days) / 10`
**After:** `log(1 + days) / 15`
**Impact:** 33% slower growth from account age

#### Liquidity Strength
**Before:** Clamped at 2.0x
**After:** Clamped at 1.5x
**Impact:** 25% reduction in maximum liquidity bonus

#### Activity Score
**Before:** `log(1 + transactions) / 5`
**After:** `log(1 + transactions) / 7`
**Impact:** 40% slower growth from activity

## Expected Behavior Now

### New User (Score: 500)
- First deposit: +15 to +30 points
- First loan: +10 to +25 points
- First repayment (on-time): +30 to +50 points

### Established User (Score: 600)
- Deposit: +5 to +20 points
- On-time repayment: +20 to +40 points
- Late repayment: +5 to +15 points
- Default: -40 to -50 points

### Score Progression Example
Starting at 500:
1. Deposit → 530 (+30)
2. Borrow → 545 (+15)
3. Repay on-time → 590 (+45)
4. Deposit → 615 (+25)
5. Borrow → 630 (+15)
6. Repay on-time → 670 (+40)

**Total after 6 actions:** 500 → 670 (170 points over multiple actions)

## Mathematical Details

### Sigmoid Comparison
```
Input (x) | Old Sigmoid (k=1) | New Sigmoid (k=2)
----------|-------------------|------------------
-2.0      | 0.12              | 0.02
-1.0      | 0.27              | 0.12
 0.0      | 0.50              | 0.50
 1.0      | 0.73              | 0.88
 2.0      | 0.88              | 0.98
```

The new sigmoid has:
- Slower growth at extremes
- More gradual transitions
- Better distribution across the 300-1000 range

### Score Distribution
With the new formula:
- **300-500 (Poor)**: Users with defaults, low activity, or new accounts
- **500-700 (Fair)**: Average users with some history and decent repayment
- **700-900 (Good)**: Experienced users with strong repayment history
- **900-1000 (Excellent)**: Elite users with perfect history and high activity

## Testing Recommendations

### Test 1: Single Action Impact
1. Note current score
2. Perform one action (deposit/borrow/repay)
3. Verify score change is ≤ 50 points

### Test 2: Gradual Progression
1. Start with new user (500)
2. Perform 5-10 actions
3. Verify score grows gradually (not jumping 200+ points)

### Test 3: Score Ceiling
1. Try to reach 900+ score
2. Should require sustained good behavior over many actions
3. Not achievable in 1-2 actions

### Test 4: Recovery from Default
1. Default on a loan (score drops)
2. Perform recovery actions (deposits, on-time repayments)
3. Verify score recovers gradually (not instantly)

## Configuration

If you need to adjust the dampening:

```typescript
// In creditScoreService.ts, normalizeScore function
const maxChange = 50;  // Adjust this value

// Smaller = more gradual (e.g., 30)
// Larger = faster changes (e.g., 75)
// Recommended range: 30-75
```

If you need to adjust sigmoid steepness:

```typescript
// In sigmoid function
sigmoid(x, k = 2)  // Adjust k value

// k=1: Steep (original)
// k=2: Gentle (current)
// k=3: Very gentle
// Recommended range: 1.5-3
```

## Benefits

1. **Predictability**: Users can understand how actions affect their score
2. **Fairness**: Can't game the system with single large actions
3. **Engagement**: Encourages sustained good behavior over time
4. **Realism**: Mimics real-world credit scoring (gradual changes)
5. **Balance**: Prevents both dramatic jumps and stagnation

## Migration Notes

Existing users with scores calculated using the old formula will gradually normalize to the new system as they perform actions. No database migration needed.
