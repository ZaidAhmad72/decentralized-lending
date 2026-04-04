# Requirements: Advanced DeFi Credit Scoring System

## Feature Overview

Replace the current simplistic credit scoring system (+20 on repay, -75 on default) with a sophisticated, multi-factor, sigmoid-based credit scoring system that dynamically reflects user behavior across multiple dimensions.

## Hard Constraints

- ✅ **Frontend/Service Layer ONLY** - No smart contract modifications
- ✅ **No core lending logic changes** - Only scoring calculation
- ✅ **Score range: 300-1000** - Fixed boundaries
- ✅ **Default new user: 500** - Starting point
- ✅ **Efficient computation** - No heavy loops
- ✅ **Trigger-based updates** - Not on every render

## Current System (To Replace)

```typescript
// Current simple system
recordRepayment(onTime: boolean) {
  score += onTime ? 20 : 5;
}

recordDefault() {
  score -= 75;
}
```

**Problems:**
- Too simplistic
- Binary rewards
- No consideration of history
- No decay mechanism
- Easily gameable

## New System (Multi-Factor Model)

### 5 Key Factors

1. **R - Repayment Reliability** (30% weight)
   - Measures on-time repayment rate
   - Range: 0-1

2. **H - Wallet History** (20% weight)
   - Measures account age/maturity
   - Range: 0-1

3. **L - Liquidity Strength** (20% weight)
   - Measures financial cushion
   - Range: 0-2 (clamped)

4. **A - Activity Score** (20% weight)
   - Measures platform engagement
   - Range: 0-1

5. **D - Default Risk** (-10% weight)
   - Penalizes defaults
   - Range: 0-1

## User Stories

### US-1: View Multi-Factor Credit Score
**As a** user  
**I want to** see my credit score calculated from multiple factors  
**So that** I understand how my behavior affects my creditworthiness

**Acceptance Criteria:**
- Score displayed as X / 1000
- Score updates on trigger events
- Score reflects all 5 factors
- New users start at 500

### US-2: Understand Score Breakdown
**As a** user  
**I want to** see how each factor contributes to my score  
**So that** I know how to improve it

**Acceptance Criteria:**
- Shows breakdown of all 5 factors
- Displays positive/negative contributions
- Updates when score changes
- Tooltip explains each factor

### US-3: See Credit Tier
**As a** user  
**I want to** see my credit tier (Excellent/Good/Fair/Poor)  
**So that** I understand my standing at a glance

**Acceptance Criteria:**
- Tier based on score ranges
- Color-coded (green/blue/yellow/red)
- Updates with score
- Shown prominently

### US-4: Track Score Progress
**As a** user  
**I want to** see a visual progress bar  
**So that** I can track my improvement

**Acceptance Criteria:**
- Progress bar from 300-1000
- Color gradient (red→yellow→green)
- Current score marked
- Smooth animations

### US-5: Experience Score Decay
**As an** inactive user  
**I want** my score to gradually decay  
**So that** the system reflects current activity

**Acceptance Criteria:**
- Decay starts after 7 days inactivity
- Exponential decay formula
- Minimum score: 300
- Stops at 300 (doesn't go below)

## Functional Requirements

### FR-1: Factor Calculations

#### R - Repayment Reliability
```typescript
R = onTimeRepayments / totalLoans

Edge case:
if (totalLoans === 0) return 0.5
```

#### H - Wallet History
```typescript
H = Math.log(1 + walletAgeDays) / 10

Examples:
- 1 day: 0.069
- 7 days: 0.208
- 30 days: 0.344
- 365 days: 0.596
```

#### L - Liquidity Strength
```typescript
L = liquidAssets / Math.max(totalBorrowed, 1)
L = Math.min(L, 2) // Clamp at 2

Examples:
- Assets: 10 ETH, Borrowed: 5 ETH → L = 2.0
- Assets: 5 ETH, Borrowed: 10 ETH → L = 0.5
- Assets: 0 ETH, Borrowed: 0 ETH → L = 0
```

#### A - Activity Score
```typescript
A = Math.log(1 + transactionsLast30Days)
A = Math.min(A / 5, 1) // Normalize to 0-1

Examples:
- 0 txs: 0
- 10 txs: 0.48
- 50 txs: 0.78
- 100+ txs: 1.0
```

#### D - Default Risk
```typescript
D = defaults / Math.max(totalLoans, 1)

Examples:
- 0 defaults, 10 loans: 0
- 1 default, 10 loans: 0.1
- 2 defaults, 5 loans: 0.4
```

### FR-2: Weighted Model

```typescript
const x = 
  0.3 * R +  // 30% Repayment
  0.2 * H +  // 20% History
  0.2 * L +  // 20% Liquidity
  0.2 * A -  // 20% Activity
  0.1 * D;   // -10% Defaults
```

### FR-3: Sigmoid Function

```typescript
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// Maps x to 0-1 range with smooth curve
```

### FR-4: Final Score Calculation

```typescript
const score = 300 + 700 * sigmoid(x);
return Math.round(score);

// Range: 300-1000
// Center: 500 (when x = 0)
```

### FR-5: Default User Logic

```typescript
if (totalLoans === 0 && walletAgeDays < 7) {
  return 500; // New user default
}
```

### FR-6: Score Decay

```typescript
if (daysInactive > 7) {
  score = score * Math.exp(-0.002 * daysInactive);
  score = Math.max(300, score);
}

Examples:
- 7 days: no decay
- 30 days: ~6% decay
- 90 days: ~16% decay
- 365 days: ~52% decay (but clamped at 300)
```

### FR-7: Credit Tiers

```typescript
function getCreditTier(score: number): string {
  if (score >= 900) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 500) return "Fair";
  return "Poor";
}
```

### FR-8: Update Triggers

Recalculate score ONLY when:
- Loan created
- Loan repaid
- Default triggered
- Deposit made
- Wallet activity detected
- OR once every 24 hours (background job)

## Non-Functional Requirements

### NFR-1: Performance
- Score calculation < 10ms
- No heavy database queries
- Cache computed score
- Recompute only on triggers

### NFR-2: Data Efficiency
- Use existing database tables
- No new heavy queries
- Aggregate data efficiently
- Cache intermediate results

### NFR-3: User Experience
- Smooth score transitions
- Clear visual feedback
- Helpful tooltips
- Progress indicators

### NFR-4: Accuracy
- Consistent calculations
- No floating point errors
- Proper edge case handling
- Deterministic results

## Data Requirements

### Existing Data (From Database)

```typescript
interface UserCreditData {
  // From reputation table
  totalLoans: number;
  successfulRepayments: number;
  defaults: number;
  totalBorrowedAmount: number;
  
  // From profiles table
  walletBalance: number; // liquidAssets
  createdAt: string; // for walletAgeDays
  
  // From transactions table
  transactionsLast30Days: number; // count
  lastActivityDate: string; // for decay
  
  // Calculated
  onTimeRepayments: number; // from loan records
  totalBorrowed: number; // current active borrows
}
```

### No New Tables Required
- Use existing `reputation` table
- Use existing `profiles` table
- Use existing `transactions` table
- Use existing `loans` table

## UI Requirements

### UI-1: Enhanced Credit Score Display

**Current:**
```
Credit Score: 500 / 1000
Tier: Good
```

**New:**
```
Credit Score: 742 / 1000
[=========>    ] Progress bar
Tier: Good

[?] Tooltip: Score based on repayment history, 
    wallet activity, liquidity strength, and default risk
```

### UI-2: Score Breakdown (USP Feature)

```
Score Breakdown:
+ Repayment Reliability: +0.25 (30%)
+ Wallet History: +0.12 (20%)
+ Liquidity Strength: +0.18 (20%)
+ Activity Score: +0.15 (20%)
- Default Risk: -0.05 (-10%)
─────────────────────────
  Total: +0.65 → Score: 742
```

### UI-3: Progress Bar

```
300 ──────────────────────────────────── 1000
     [====Poor====][==Fair==][=Good=][Exc]
                        ↑ You are here (742)
```

Colors:
- 300-500: Red
- 500-700: Yellow
- 700-900: Light Green
- 900-1000: Dark Green

### UI-4: Tooltips

**Repayment Reliability:**
"Percentage of loans repaid on time. Higher is better."

**Wallet History:**
"Account age and maturity. Older accounts score higher."

**Liquidity Strength:**
"Your available assets vs borrowed amount. Higher cushion = better score."

**Activity Score:**
"Platform engagement in last 30 days. More activity = better score."

**Default Risk:**
"Defaults hurt your score. Avoid missing payments."

## Edge Cases

### EC-1: New User (No History)
- totalLoans = 0
- walletAge < 7 days
- **Result:** Score = 500

### EC-2: Perfect User
- 100% on-time repayments
- High liquidity
- Active
- No defaults
- **Result:** Score → 900-1000

### EC-3: Risky User
- Multiple defaults
- Low liquidity
- Inactive
- **Result:** Score → 300-400

### EC-4: Division by Zero
- totalLoans = 0 → R = 0.5 (default)
- totalBorrowed = 0 → use Math.max(1)
- Prevent all division by zero

### EC-5: Inactive User
- No activity for 90 days
- Score decays exponentially
- Stops at 300 minimum

### EC-6: Extreme Values
- Very high liquidity → clamp L at 2
- Very high activity → clamp A at 1
- Score always 300-1000

## Test Cases

### TC-1: New User
```typescript
Input: {
  totalLoans: 0,
  walletAgeDays: 3,
  liquidAssets: 2,
  totalBorrowed: 0,
  transactionsLast30Days: 5,
  defaults: 0
}
Expected: score = 500
```

### TC-2: Good User
```typescript
Input: {
  totalLoans: 10,
  onTimeRepayments: 9,
  walletAgeDays: 180,
  liquidAssets: 10,
  totalBorrowed: 5,
  transactionsLast30Days: 25,
  defaults: 0
}
Expected: score ≈ 750-850
```

### TC-3: Risky User
```typescript
Input: {
  totalLoans: 10,
  onTimeRepayments: 5,
  walletAgeDays: 30,
  liquidAssets: 1,
  totalBorrowed: 10,
  transactionsLast30Days: 2,
  defaults: 3
}
Expected: score ≈ 350-450
```

### TC-4: Inactive User
```typescript
Input: {
  score: 700,
  daysInactive: 90
}
Expected: score ≈ 588 (16% decay)
```

## Success Metrics

- ✅ Score reflects all 5 factors
- ✅ New users start at 500
- ✅ Score range: 300-1000
- ✅ Calculation < 10ms
- ✅ Updates only on triggers
- ✅ Decay works for inactive users
- ✅ UI shows breakdown
- ✅ Progress bar functional
- ✅ No console errors

## Out of Scope

- ❌ Smart contract modifications
- ❌ Core lending logic changes
- ❌ New database tables
- ❌ Machine learning models
- ❌ External credit data
- ❌ Historical score tracking (for now)
- ❌ Score prediction

## Migration Strategy

### Phase 1: Implement New System
- Create creditScoreService.ts
- Add calculation functions
- Test thoroughly

### Phase 2: Update UI
- Add progress bar
- Add breakdown display
- Add tooltips

### Phase 3: Integrate
- Update reputationService.ts
- Trigger on loan events
- Trigger on wallet events

### Phase 4: Deploy
- Test with real data
- Monitor score distribution
- Adjust weights if needed

## Validation Rules

- Score must be 300-1000
- All factors must be 0-1 (except L: 0-2)
- Weights must sum to 1.0 (excluding D)
- Sigmoid must return 0-1
- No NaN or Infinity values

## Dependencies

- Existing reputationService.ts
- Existing database tables
- Math functions (log, exp)
- No new npm packages

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Score volatility | Use sigmoid smoothing |
| Gaming the system | Multi-factor approach |
| Performance issues | Cache and trigger-based |
| Data inconsistency | Validate all inputs |
| User confusion | Clear UI breakdown |

## Documentation Requirements

- JSDoc comments for all functions
- Explain each factor calculation
- Document weight rationale
- Provide examples
- Add inline comments

## Acceptance Criteria

- [ ] Score calculated using 5 factors
- [ ] Sigmoid function implemented
- [ ] Weighted model working
- [ ] Default user logic correct
- [ ] Score decay functional
- [ ] Credit tiers accurate
- [ ] UI shows breakdown
- [ ] Progress bar displays
- [ ] Tooltips informative
- [ ] Performance < 10ms
- [ ] No console errors
- [ ] Edge cases handled
- [ ] Tests pass
- [ ] Documentation complete
