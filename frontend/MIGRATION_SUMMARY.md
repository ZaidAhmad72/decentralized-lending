# P2P → Pool Migration Summary

## What Changed

### ❌ Removed (P2P System)
- Lender-borrower matching
- Marketplace for funding loans
- `lender_id` field in loans
- Purpose field in loan requests
- Manual funding by lenders

### ✅ Added (Pool System)

#### New Tables
1. **pool** - Global liquidity pool (single row)
   - `total_liquidity` - All deposited funds
   - `total_borrowed` - Currently borrowed amount

2. **deposits** - Individual lender deposits
   - Tracks who deposited what

3. **loans** - Pool-based loans (no lender_id)
   - Borrowers borrow from pool, not individuals

4. **transactions** - Audit log
   - Tracks all deposit/borrow/repay operations

#### New Service Layer
- `frontend/services/poolService.ts`
  - `depositToPool()` - Add liquidity
  - `getPoolStats()` - Get pool data
  - `getUserDeposits()` - Get user deposits
  - `getUserTransactions()` - Get transaction history

- `frontend/services/loanService.ts`
  - `borrowFromPool()` - Borrow from pool
  - `repayLoan()` - Repay loan
  - `getUserActiveLoan()` - Get active loan
  - `checkAndMarkDefaulted()` - Mark overdue loans

#### New Pages
- `/deposit` - Deposit funds to pool

#### Updated Pages
- `/dashboard` - Shows pool stats + user deposits
- `/request-loan` - Borrows from pool (checks liquidity)
- `/repay` - Repays to pool (decreases total_borrowed)

#### Updated Navigation
- HOME → Dashboard
- DEPOSIT → Deposit page
- BORROW → Request loan
- REPAY → Repay page

## Key Differences

### P2P (Old)
```
Borrower creates request → Lender funds → Borrower repays lender
```

### Pool (New)
```
Lender deposits to pool → Borrower borrows from pool → Borrower repays to pool
```

## Accounting Model

### P2P (Old)
- Each loan had a specific lender
- Repayment went to that lender
- No shared liquidity

### Pool (New)
- All deposits go to shared pool
- Borrowers borrow from pool
- Repayments reduce pool debt
- Available = total_liquidity - total_borrowed

## Database Changes

### Before (P2P)
```sql
loan_requests (
  borrower_id,
  lender_id,  ← specific lender
  amount,
  purpose,
  status: pending | funded | repaid
)
```

### After (Pool)
```sql
pool (
  total_liquidity,
  total_borrowed
)

deposits (
  user_id,
  amount
)

loans (
  borrower_id,  ← no lender_id
  amount,
  status: active | repaid | defaulted
)

transactions (
  user_id,
  type: deposit | borrow | repay,
  amount
)
```

## User Flows

### Lender Flow
**Before:** Browse loans → Fund specific loan → Wait for repayment
**After:** Deposit to pool → Earn interest from all loans

### Borrower Flow
**Before:** Request loan → Wait for lender → Get funded → Repay
**After:** Borrow from pool (instant if liquidity available) → Repay

## Code Structure

### Old (P2P)
```
frontend/lib/loans.ts
  - createLoanRequest()
  - fetchPendingLoans()
  - fundLoan()
  - repayLoan()
```

### New (Pool)
```
frontend/services/
  poolService.ts
    - depositToPool()
    - getPoolStats()
  
  loanService.ts
    - borrowFromPool()
    - repayLoan()
```

## What to Remove Later

1. `frontend/lib/loans.ts` - Old P2P service
2. `frontend/app/loans/page.tsx` - Old marketplace
3. `frontend/components/LoanCard.tsx` - P2P loan cards
4. `loan_requests` table - Can drop after migration

## Smart Contract Readiness

The new service layer is structured for easy smart contract integration:

```typescript
// Current (Supabase)
await depositToPool(userId, amount);

// Future (Smart Contract)
await contract.deposit(amount);
```

All business logic (liquidity checks, pool updates) will move on-chain.

## Testing Checklist

- [ ] Run SQL schema in Supabase
- [ ] Sign up new user
- [ ] Deposit 1000 to pool
- [ ] Check pool.total_liquidity = 1000
- [ ] Borrow 500 from pool
- [ ] Check pool.total_borrowed = 500
- [ ] Check available = 500
- [ ] Repay loan
- [ ] Check pool.total_borrowed = 0
- [ ] Check reputation increased by +10
- [ ] View transaction history

## Files Created/Modified

### Created
- `frontend/services/poolService.ts`
- `frontend/services/loanService.ts`
- `frontend/app/deposit/page.tsx`
- `frontend/sql/complete-schema.sql`
- `frontend/POOL_SYSTEM.md`
- `frontend/SETUP_GUIDE.md`
- `frontend/MIGRATION_SUMMARY.md`

### Modified
- `frontend/app/dashboard/page.tsx`
- `frontend/app/request-loan/page.tsx`
- `frontend/app/repay/page.tsx`
- `frontend/components/Navbar.tsx`

### To Remove (Later)
- `frontend/lib/loans.ts`
- `frontend/app/loans/page.tsx`
- `frontend/components/LoanCard.tsx`

## Next Steps

1. Run `frontend/sql/complete-schema.sql` in Supabase
2. Test deposit → borrow → repay flow
3. Verify pool accounting is correct
4. Remove old P2P code
5. Build smart contracts
6. Replace service layer with contract calls
