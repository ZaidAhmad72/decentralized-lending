# Implementation Plan: Advanced DeFi Credit Scoring System

## Overview

Replace the current simplistic credit scoring system (+20/-75) with a sophisticated multi-factor sigmoid-based model. This implementation focuses on creating a new creditScoreService.ts with 5 behavioral factors (Repayment Reliability, Wallet History, Liquidity Strength, Activity Score, Default Risk), integrating it with the existing reputationService.ts, and building UI components to display the enhanced score with breakdown.

## Tasks

- [x] 1. Create core credit scoring service
  - [x] 1.1 Create creditScoreService.ts with interfaces and types
    - Create `frontend/services/creditScoreService.ts`
    - Define `UserCreditData`, `ScoreBreakdown`, and `CreditScoreResult` interfaces
    - Export all types for use in other services
    - _Requirements: FR-1, NFR-2_

  - [x] 1.2 Implement factor calculation functions
    - Implement `calculateRepaymentReliability()` - handles totalLoans = 0 edge case
    - Implement `calculateWalletHistory()` - logarithmic scaling
    - Implement `calculateLiquidityStrength()` - clamped at 2
    - Implement `calculateActivityScore()` - normalized to 0-1
    - Implement `calculateDefaultRisk()` - handles division by zero
    - _Requirements: FR-1, EC-4_

  - [x] 1.3 Implement weighted model and sigmoid functions
    - Implement `applyWeightedModel()` with correct weights (0.3, 0.2, 0.2, 0.2, -0.1)
    - Implement `sigmoid()` activation function
    - Implement `applyScoreDecay()` for inactive users (exponential decay after 7 days)
    - Implement `getDaysInactive()` helper
    - _Requirements: FR-2, FR-3, FR-6_

  - [x] 1.4 Implement main calculateCreditScore function
    - Handle new user default (score = 500)
    - Calculate all 5 factors
    - Apply weighted model and sigmoid
    - Apply score decay if inactive
    - Clamp score to 300-1000 range
    - Return CreditScoreResult with breakdown
    - _Requirements: FR-4, FR-5, US-1_

  - [x] 1.5 Implement helper functions
    - Implement `getCreditTier()` - maps score to Excellent/Good/Fair/Poor
    - Implement `getTierColor()` - returns Tailwind classes
    - Implement `getDefaultBreakdown()` - for new users
    - _Requirements: FR-7, UI-3_

- [x] 2. Implement data gathering and caching
  - [x] 2.1 Create gatherUserCreditData function
    - Query reputation, profiles, loans, and transactions tables
    - Calculate on-time repayments from loan records
    - Calculate wallet age from profile created_at
    - Count transactions in last 30 days
    - Get last activity date
    - Return complete UserCreditData object
    - _Requirements: FR-1, NFR-2_

  - [x] 2.2 Add caching mechanism
    - Implement in-memory cache with Map
    - Implement `getCachedScore()` with 1-minute TTL
    - Implement `setCachedScore()` to store computed scores
    - Cache invalidation on score updates
    - _Requirements: NFR-1_

- [x] 3. Integrate with reputationService
  - [x] 3.1 Update reputationService.ts with new functions
    - Import creditScoreService functions
    - Implement `recalculateCreditScore()` - main integration point
    - Implement `getScoreBreakdown()` - for UI display
    - Update database with new score
    - _Requirements: FR-8, US-1_

  - [x] 3.2 Add trigger points in loanService.ts
    - Call `recalculateCreditScore()` after loan creation
    - Call `recalculateCreditScore()` after loan repayment
    - Call `recalculateCreditScore()` after default
    - _Requirements: FR-8_

  - [x] 3.3 Add trigger points in poolService.ts
    - Call `recalculateCreditScore()` after deposit
    - _Requirements: FR-8_

- [x] 4. Checkpoint - Verify core logic
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create UI components
  - [x] 5.1 Create CreditScoreDisplay component
    - Create `frontend/components/CreditScoreDisplay.tsx`
    - Display score as "X / 1000" with large font
    - Show credit tier badge with color coding
    - Include ProgressBar component
    - Conditionally show ScoreBreakdown
    - _Requirements: US-1, US-3, UI-1_

  - [x] 5.2 Create ProgressBar component
    - Create `frontend/components/ProgressBar.tsx`
    - Visual bar from 300-1000 with percentage fill
    - Color gradient based on score (red/yellow/green)
    - Show tick marks at 300, 500, 700, 900, 1000
    - Smooth transition animations
    - _Requirements: US-4, UI-3_

  - [x] 5.3 Create ScoreBreakdown component
    - Create `frontend/components/ScoreBreakdown.tsx`
    - Display all 5 factors with their contributions
    - Show positive/negative values with colors
    - Include tooltips for each factor
    - Display weighted sum and final score
    - _Requirements: US-2, UI-2_

- [x] 6. Integrate UI components into pages
  - [x] 6.1 Update dashboard page
    - Import and use CreditScoreDisplay component
    - Replace existing credit score display
    - Show score breakdown on hover or click
    - Fetch score breakdown from reputationService
    - _Requirements: US-1, US-2_

  - [x] 6.2 Update request-loan page
    - Import and use CreditScoreDisplay component
    - Show how loan affects score (optional enhancement)
    - Display credit tier prominently
    - _Requirements: US-3_

- [ ] 7. Final checkpoint and testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All code is TypeScript (frontend/service layer only)
- No smart contract modifications
- No new database tables required
- Uses existing reputation, profiles, loans, and transactions tables
- Score calculation must be < 10ms (cached)
- Trigger-based updates only (not on every render)
- New users default to score 500
- Score range: 300-1000 (strictly enforced)
- Sigmoid smoothing prevents score volatility
