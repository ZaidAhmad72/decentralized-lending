# Technical Design: Advanced DeFi Credit Scoring System

## Design Overview

Implement a sophisticated, multi-factor credit scoring system that replaces the current simplistic +20/-75 model with a sigmoid-based calculation using 5 behavioral factors.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Actions                              │
│  (Borrow, Repay, Deposit, Default, Activity)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Trigger Event
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              creditScoreService.ts                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  calculateCreditScore(userData)                       │  │
│  │    ├─ calculateRepaymentReliability()                │  │
│  │    ├─ calculateWalletHistory()                       │  │
│  │    ├─ calculateLiquidityStrength()                   │  │
│  │    ├─ calculateActivityScore()                       │  │
│  │    ├─ calculateDefaultRisk()                         │  │
│  │    ├─ applyWeightedModel()                           │  │
│  │    ├─ applySigmoid()                                 │  │
│  │    └─ applyScoreDecay()                              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ New Score
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              reputationService.ts                            │
│  - updateCreditScore()                                       │
│  - getCreditTier()                                           │
│  - getScoreBreakdown()                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Display
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                             │
│  - CreditScoreDisplay                                        │
│  - ScoreBreakdown                                            │
│  - ProgressBar                                               │
└─────────────────────────────────────────────────────────────┘
```

## Data Structures

### UserCreditData Interface

```typescript
// services/creditScoreService.ts

export interface UserCreditData {
  // Repayment metrics
  totalLoans: number;
  onTimeRepayments: number;
  successfulRepayments: number;
  defaults: number;
  
  // Financial metrics
  liquidAssets: number; // wallet_balance
  totalBorrowed: number; // current active borrows
  totalBorrowedAmount: number; // lifetime
  
  // Activity metrics
  walletAgeDays: number;
  transactionsLast30Days: number;
  lastActivityDate: Date;
  
  // Current score
  currentScore?: number;
}

export interface ScoreBreakdown {
  repaymentReliability: number; // R
  walletHistory: number; // H
  liquidityStrength: number; // L
  activityScore: number; // A
  defaultRisk: number; // D
  weightedSum: number; // x
  finalScore: number; // 300-1000
}

export interface CreditScoreResult {
  score: number;
  tier: string;
  breakdown: ScoreBreakdown;
  previousScore?: number;
  change?: number;
}
```

## Core Functions

### 1. Factor Calculations

```typescript
// services/creditScoreService.ts

/**
 * Calculate Repayment Reliability (R)
 * Measures on-time repayment rate
 * Weight: 30%
 */
function calculateRepaymentReliability(data: UserCreditData): number {
  if (data.totalLoans === 0) {
    return 0.5; // Default for new users
  }
  
  return data.onTimeRepayments / data.totalLoans;
}

/**
 * Calculate Wallet History (H)
 * Measures account maturity
 * Weight: 20%
 */
function calculateWalletHistory(data: UserCreditData): number {
  return Math.log(1 + data.walletAgeDays) / 10;
}

/**
 * Calculate Liquidity Strength (L)
 * Measures financial cushion
 * Weight: 20%
 */
function calculateLiquidityStrength(data: UserCreditData): number {
  const ratio = data.liquidAssets / Math.max(data.totalBorrowed, 1);
  return Math.min(ratio, 2); // Clamp at 2
}

/**
 * Calculate Activity Score (A)
 * Measures platform engagement
 * Weight: 20%
 */
function calculateActivityScore(data: UserCreditData): number {
  const rawScore = Math.log(1 + data.transactionsLast30Days);
  return Math.min(rawScore / 5, 1); // Normalize to 0-1
}

/**
 * Calculate Default Risk (D)
 * Penalizes defaults
 * Weight: -10%
 */
function calculateDefaultRisk(data: UserCreditData): number {
  return data.defaults / Math.max(data.totalLoans, 1);
}
```

### 2. Weighted Model

```typescript
/**
 * Apply weighted model to factors
 */
function applyWeightedModel(breakdown: ScoreBreakdown): number {
  const x = 
    0.3 * breakdown.repaymentReliability +
    0.2 * breakdown.walletHistory +
    0.2 * breakdown.liquidityStrength +
    0.2 * breakdown.activityScore -
    0.1 * breakdown.defaultRisk;
  
  return x;
}
```

### 3. Sigmoid Function

```typescript
/**
 * Sigmoid activation function
 * Maps any real number to 0-1 range with smooth curve
 */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
```

### 4. Main Calculation Function

```typescript
/**
 * Calculate credit score from user data
 * Returns score in range 300-1000
 */
export function calculateCreditScore(data: UserCreditData): CreditScoreResult {
  // Handle new users
  if (data.totalLoans === 0 && data.walletAgeDays < 7) {
    return {
      score: 500,
      tier: getCreditTier(500),
      breakdown: getDefaultBreakdown(),
    };
  }
  
  // Calculate all factors
  const breakdown: ScoreBreakdown = {
    repaymentReliability: calculateRepaymentReliability(data),
    walletHistory: calculateWalletHistory(data),
    liquidityStrength: calculateLiquidityStrength(data),
    activityScore: calculateActivityScore(data),
    defaultRisk: calculateDefaultRisk(data),
    weightedSum: 0,
    finalScore: 0,
  };
  
  // Apply weighted model
  breakdown.weightedSum = applyWeightedModel(breakdown);
  
  // Apply sigmoid and scale to 300-1000
  const sigmoidValue = sigmoid(breakdown.weightedSum);
  let score = 300 + 700 * sigmoidValue;
  
  // Apply decay if inactive
  const daysInactive = getDaysInactive(data.lastActivityDate);
  if (daysInactive > 7) {
    score = applyScoreDecay(score, daysInactive);
  }
  
  // Round and clamp
  score = Math.round(score);
  score = Math.max(300, Math.min(1000, score));
  
  breakdown.finalScore = score;
  
  return {
    score,
    tier: getCreditTier(score),
    breakdown,
    previousScore: data.currentScore,
    change: data.currentScore ? score - data.currentScore : undefined,
  };
}
```

### 5. Score Decay

```typescript
/**
 * Apply exponential decay for inactive users
 */
export function applyScoreDecay(score: number, daysInactive: number): number {
  if (daysInactive <= 7) {
    return score;
  }
  
  const decayedScore = score * Math.exp(-0.002 * daysInactive);
  return Math.max(300, decayedScore);
}

/**
 * Calculate days since last activity
 */
function getDaysInactive(lastActivityDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastActivityDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
```

### 6. Credit Tier

```typescript
/**
 * Get credit tier from score
 */
export function getCreditTier(score: number): string {
  if (score >= 900) return "Excellent";
  if (score >= 700) return "Good";
  if (score >= 500) return "Fair";
  return "Poor";
}

/**
 * Get tier color
 */
export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    Excellent: "bg-green-500 text-white",
    Good: "bg-blue-500 text-white",
    Fair: "bg-yellow-500 text-white",
    Poor: "bg-red-500 text-white",
  };
  return colors[tier] || "bg-gray-500 text-white";
}
```

## Data Collection

### Gather User Credit Data

```typescript
/**
 * Gather all data needed for credit score calculation
 */
export async function gatherUserCreditData(userId: string): Promise<UserCreditData> {
  const supabase = createClient();
  
  // Get reputation data
  const { data: reputation } = await supabase
    .from("reputation")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  // Get profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_balance, created_at")
    .eq("id", userId)
    .single();
  
  // Get loan data for on-time repayments
  const { data: loans } = await supabase
    .from("loans")
    .select("due_date, status, created_at")
    .eq("borrower_id", userId);
  
  // Calculate on-time repayments
  const onTimeRepayments = loans?.filter(loan => {
    if (loan.status !== "repaid") return false;
    // Check if repaid before due date (simplified)
    return true; // TODO: Add actual repayment date check
  }).length || 0;
  
  // Get current active borrows
  const { data: activeLoans } = await supabase
    .from("loans")
    .select("amount")
    .eq("borrower_id", userId)
    .eq("status", "active");
  
  const totalBorrowed = activeLoans?.reduce((sum, loan) => sum + loan.amount, 0) || 0;
  
  // Get transactions last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const { count: transactionsLast30Days } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgo.toISOString());
  
  // Get last activity date
  const { data: lastTransaction } = await supabase
    .from("transactions")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  // Calculate wallet age
  const walletAgeDays = profile?.created_at 
    ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  return {
    totalLoans: reputation?.total_loans || 0,
    onTimeRepayments,
    successfulRepayments: reputation?.successful_repayments || 0,
    defaults: reputation?.defaults || 0,
    liquidAssets: profile?.wallet_balance || 0,
    totalBorrowed,
    totalBorrowedAmount: reputation?.total_borrowed_amount || 0,
    walletAgeDays,
    transactionsLast30Days: transactionsLast30Days || 0,
    lastActivityDate: lastTransaction?.created_at 
      ? new Date(lastTransaction.created_at)
      : new Date(),
    currentScore: reputation?.credit_score,
  };
}
```

## Integration Points

### Update reputationService.ts

```typescript
// services/reputationService.ts

import { calculateCreditScore, gatherUserCreditData } from './creditScoreService';

/**
 * Recalculate and update credit score
 * Call this on trigger events
 */
export async function recalculateCreditScore(userId: string): Promise<number> {
  // Gather data
  const userData = await gatherUserCreditData(userId);
  
  // Calculate new score
  const result = calculateCreditScore(userData);
  
  // Update in database
  const { error } = await supabase
    .from("reputation")
    .update({ 
      credit_score: result.score,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  
  if (error) throw new Error(error.message);
  
  return result.score;
}

/**
 * Get score breakdown for display
 */
export async function getScoreBreakdown(userId: string): Promise<ScoreBreakdown> {
  const userData = await gatherUserCreditData(userId);
  const result = calculateCreditScore(userData);
  return result.breakdown;
}
```

### Trigger Points

```typescript
// services/loanService.ts

// After loan creation
await recordLoan(borrowerId, amount);
await recalculateCreditScore(borrowerId); // NEW

// After loan repayment
await recordRepayment(borrowerId, onTime);
await recalculateCreditScore(borrowerId); // NEW

// After default
await recordDefault(borrowerId);
await recalculateCreditScore(borrowerId); // NEW
```

```typescript
// services/poolService.ts

// After deposit
await depositToPool(userId, amount);
await recalculateCreditScore(userId); // NEW
```

## UI Components

### 1. CreditScoreDisplay Component

```typescript
// components/CreditScoreDisplay.tsx

interface CreditScoreDisplayProps {
  score: number;
  tier: string;
  breakdown?: ScoreBreakdown;
  showBreakdown?: boolean;
}

export default function CreditScoreDisplay({
  score,
  tier,
  breakdown,
  showBreakdown = false,
}: CreditScoreDisplayProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6">
      {/* Score Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Credit Score</p>
          <p className="text-4xl font-black text-gray-900 dark:text-white">
            {score}
            <span className="text-lg text-gray-500 dark:text-gray-400"> / 1000</span>
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full font-bold ${getTierColor(tier)}`}>
          {tier}
        </span>
      </div>
      
      {/* Progress Bar */}
      <ProgressBar score={score} />
      
      {/* Breakdown */}
      {showBreakdown && breakdown && (
        <ScoreBreakdown breakdown={breakdown} />
      )}
    </div>
  );
}
```

### 2. ProgressBar Component

```typescript
// components/ProgressBar.tsx

interface ProgressBarProps {
  score: number;
}

export default function ProgressBar({ score }: ProgressBarProps) {
  const percentage = ((score - 300) / 700) * 100;
  
  // Color based on score
  const getColor = () => {
    if (score >= 900) return "bg-green-600";
    if (score >= 700) return "bg-green-400";
    if (score >= 500) return "bg-yellow-400";
    return "bg-red-400";
  };
  
  return (
    <div className="relative">
      {/* Background */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Progress */}
        <div 
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>300</span>
        <span>500</span>
        <span>700</span>
        <span>900</span>
        <span>1000</span>
      </div>
    </div>
  );
}
```

### 3. ScoreBreakdown Component

```typescript
// components/ScoreBreakdown.tsx

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdown;
}

export default function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const factors = [
    {
      name: "Repayment Reliability",
      value: breakdown.repaymentReliability,
      weight: 0.3,
      tooltip: "Percentage of loans repaid on time. Higher is better.",
    },
    {
      name: "Wallet History",
      value: breakdown.walletHistory,
      weight: 0.2,
      tooltip: "Account age and maturity. Older accounts score higher.",
    },
    {
      name: "Liquidity Strength",
      value: breakdown.liquidityStrength,
      weight: 0.2,
      tooltip: "Your available assets vs borrowed amount.",
    },
    {
      name: "Activity Score",
      value: breakdown.activityScore,
      weight: 0.2,
      tooltip: "Platform engagement in last 30 days.",
    },
    {
      name: "Default Risk",
      value: breakdown.defaultRisk,
      weight: -0.1,
      tooltip: "Defaults hurt your score. Avoid missing payments.",
    },
  ];
  
  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <p className="text-sm font-bold text-gray-900 dark:text-white mb-4">
        Score Breakdown
      </p>
      
      <div className="space-y-3">
        {factors.map((factor) => {
          const contribution = factor.value * factor.weight;
          const isPositive = contribution >= 0;
          
          return (
            <div key={factor.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {factor.name}
                </span>
                <Tooltip text={factor.tooltip} />
              </div>
              <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{contribution.toFixed(2)}
              </span>
            </div>
          );
        })}
        
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              Total
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {breakdown.weightedSum.toFixed(2)} → {breakdown.finalScore}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Performance Optimizations

### 1. Caching

```typescript
// Cache score in memory
const scoreCache = new Map<string, { score: number; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

export function getCachedScore(userId: string): number | null {
  const cached = scoreCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.score;
  }
  return null;
}

export function setCachedScore(userId: string, score: number): void {
  scoreCache.set(userId, { score, timestamp: Date.now() });
}
```

### 2. Debouncing

```typescript
// Debounce score recalculation
const recalculateDebounced = debounce(recalculateCreditScore, 1000);
```

### 3. Batch Updates

```typescript
// Update multiple users at once (for background job)
export async function batchRecalculateScores(userIds: string[]): Promise<void> {
  const promises = userIds.map(id => recalculateCreditScore(id));
  await Promise.all(promises);
}
```

## File Structure

```
frontend/
├── services/
│   ├── creditScoreService.ts [NEW] - Core calculation logic
│   └── reputationService.ts [MODIFIED] - Integration
├── components/
│   ├── CreditScoreDisplay.tsx [NEW] - Main display
│   ├── ProgressBar.tsx [NEW] - Visual progress
│   └── ScoreBreakdown.tsx [NEW] - Factor breakdown
└── app/
    ├── dashboard/
    │   └── page.tsx [MODIFIED] - Show enhanced score
    └── request-loan/
        └── page.tsx [MODIFIED] - Show score impact
```

## Testing Strategy

### Unit Tests

```typescript
describe('creditScoreService', () => {
  it('calculates new user score as 500', () => {
    const data: UserCreditData = {
      totalLoans: 0,
      walletAgeDays: 3,
      // ... other fields
    };
    const result = calculateCreditScore(data);
    expect(result.score).toBe(500);
  });
  
  it('applies score decay for inactive users', () => {
    const score = applyScoreDecay(700, 90);
    expect(score).toBeLessThan(700);
    expect(score).toBeGreaterThanOrEqual(300);
  });
  
  // More tests...
});
```

## Migration Path

1. Create creditScoreService.ts
2. Test calculations thoroughly
3. Update reputationService.ts
4. Create UI components
5. Integrate with existing pages
6. Deploy and monitor

## Success Criteria

✅ Score calculated using 5 factors
✅ Sigmoid smoothing applied
✅ Decay works for inactive users
✅ UI shows breakdown
✅ Performance < 10ms
✅ No console errors
✅ Tests pass
