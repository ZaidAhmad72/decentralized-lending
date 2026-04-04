# Peer-to-Pool Lending System

## Overview
This is a pool-based lending platform where lenders deposit funds into a shared pool and borrowers borrow directly from the pool. No peer-to-peer matching required.

## Architecture

### Database Schema
Located in: `frontend/sql/pool-schema.sql`

**Tables:**
- `pool` - Single row tracking global liquidity (id=1)
  - `total_liquidity` - Total deposited funds
  - `total_borrowed` - Currently borrowed amount
  - Available liquidity = total_liquidity - total_borrowed

- `deposits` - Individual lender deposits
  - `user_id`, `amount`, `created_at`

- `loans` - Borrower loans (NO lender_id)
  - `borrower_id`, `amount`, `duration_days`, `interest_rate`, `status`, `due_date`

- `profiles` - User profiles
  - `name`, `email`, `reputation_score`, `wallet_address`

### Service Layer
Structured for future smart contract integration:

**`frontend/services/poolService.ts`**
- `getPoolStats()` - Get pool liquidity data
- `depositToPool(userId, amount)` - Deposit funds
- `getUserDeposits(userId)` - Get user's deposits
- `getUserTotalDeposited(userId)` - Get total deposited by user

**`frontend/services/loanService.ts`**
- `borrowFromPool(borrowerId, amount, durationDays)` - Borrow from pool
- `getUserActiveLoan(borrowerId)` - Get active loan
- `getUserLoans(borrowerId)` - Get all loans
- `repayLoan(loanId, borrowerId)` - Repay loan
- `checkAndMarkDefaulted(borrowerId)` - Mark overdue loans

## Accounting Rules

### CRITICAL: Pool Accounting
- **Deposit**: Increase `total_liquidity` only
- **Borrow**: Increase `total_borrowed` only (DO NOT decrease liquidity)
- **Repay**: Decrease `total_borrowed` only (DO NOT increase liquidity)
- **Available** = `total_liquidity - total_borrowed`

### Why This Matters
This matches how smart contracts will work:
- Liquidity represents deposited capital
- Borrowed represents active loans
- Repayments reduce debt but don't add new capital

## Features

### 1. Deposit to Pool (`/deposit`)
- User deposits USDC to pool
- Increases `total_liquidity`
- Tracks individual deposits

### 2. Borrow from Pool (`/request-loan`)
- User borrows if `available_liquidity >= amount`
- Increases `total_borrowed`
- Creates loan with status "active"
- Interest rate: 0.024% daily

### 3. Repay Loan (`/repay`)
- User repays active loan
- Decreases `total_borrowed`
- Updates loan status to "repaid"
- Increases `reputation_score` by +10

### 4. Dashboard (`/dashboard`)
- Shows pool stats (liquidity, available, borrowed)
- Shows user deposits
- Shows active loan
- Shows reputation score

## Pages

- `/dashboard` - Main dashboard with pool stats
- `/deposit` - Deposit funds to pool
- `/request-loan` - Borrow from pool
- `/repay` - Repay active loan
- `/loans` - OLD P2P marketplace (to be removed)

## Navigation
Updated navbar with:
- HOME
- DEPOSIT
- BORROW
- REPAY

## Future Smart Contract Integration

The service layer is designed so DB calls can be replaced with contract calls:

```typescript
// Current (Supabase)
await depositToPool(userId, amount);

// Future (Smart Contract)
await contract.deposit(amount);
```

All business logic (checking liquidity, updating pool stats) will move to smart contracts.

## Reputation System
- Start: 0 points
- Repay on time: +10 points
- Default: -20 points
- Used for future credit scoring

## Interest Calculation
- Daily rate: 0.024%
- Total interest = `amount * (0.024 / 100) * duration_days`
- Displayed at borrow and repay

## Next Steps
1. Run SQL schema in Supabase
2. Test deposit flow
3. Test borrow flow
4. Test repay flow
5. Remove old P2P code (`/loans` page, `frontend/lib/loans.ts`)
6. Integrate with smart contracts when ready
