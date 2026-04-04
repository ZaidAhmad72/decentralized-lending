# Pool-Based Lending System - Setup Guide

## Step 1: Run SQL Schema in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `frontend/sql/complete-schema.sql`
4. Paste and run the SQL

This will:
- Create/update `profiles` table with `reputation_score` and `wallet_address`
- Create `pool` table (single row for global liquidity)
- Create `deposits` table (tracks individual deposits)
- Create `loans` table (pool-based loans, no lender_id)
- Create `transactions` table (audit log for all operations)
- Set up Row Level Security (RLS) policies
- Create performance indexes

## Step 2: Verify Tables

Run this query in Supabase SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'pool', 'deposits', 'loans', 'transactions');
```

You should see all 5 tables.

## Step 3: Check Pool Initialization

```sql
SELECT * FROM pool;
```

Should return:
```
id | total_liquidity | total_borrowed | created_at
1  | 0               | 0              | [timestamp]
```

## Step 4: Test the Application

### A. Sign Up / Login
1. Go to `http://localhost:3000`
2. Create a new account or login
3. Profile will be created automatically

### B. Deposit Flow
1. Navigate to `/deposit`
2. Enter amount (e.g., 1000)
3. Click "Deposit to Pool"
4. Check dashboard - should show your deposit

**What happens:**
- Insert into `deposits` table
- Increase `pool.total_liquidity`
- Log transaction (type: "deposit")

### C. Borrow Flow
1. Navigate to `/request-loan` (or click "Borrow from Pool")
2. Enter amount (e.g., 500)
3. Select duration (e.g., 30 days)
4. Click "Borrow from Pool"

**What happens:**
- Check if `available_liquidity >= amount`
- If yes: Insert into `loans`, increase `pool.total_borrowed`
- Log transaction (type: "borrow")
- Redirect to dashboard

**Error if insufficient liquidity:**
```
Insufficient liquidity. Available: [amount]
```

### D. Repay Flow
1. Navigate to `/repay`
2. See your active loan details
3. Click "Repay [amount]"

**What happens:**
- Update loan status to "repaid"
- Decrease `pool.total_borrowed`
- Increase `reputation_score` by +10
- Log transaction (type: "repay")

### E. Dashboard
Shows:
- Pool liquidity (total deposited)
- Available liquidity (total - borrowed)
- Your deposits
- Your reputation score
- Active loan (if any)

## Step 5: Verify Database Changes

### Check Pool Stats
```sql
SELECT * FROM pool;
```

After deposit of 1000:
```
total_liquidity: 1000
total_borrowed: 0
```

After borrow of 500:
```
total_liquidity: 1000
total_borrowed: 500
```

After repay:
```
total_liquidity: 1000
total_borrowed: 0
```

### Check Transactions
```sql
SELECT * FROM transactions ORDER BY created_at DESC;
```

Should show:
- deposit → 1000
- borrow → 500
- repay → 500

### Check Reputation
```sql
SELECT name, reputation_score FROM profiles;
```

After repay, should be +10.

## Common Issues

### Issue: "Could not find table 'pool'"
**Solution:** Run the SQL schema in Supabase

### Issue: "Insufficient liquidity"
**Solution:** Deposit more funds first, or reduce borrow amount

### Issue: "RLS policy violation"
**Solution:** Make sure you're logged in and the user_id matches auth.uid()

### Issue: "No active loan"
**Solution:** Borrow first before trying to repay

## Architecture Notes

### Service Layer
- `frontend/services/poolService.ts` - Deposit, stats, transactions
- `frontend/services/loanService.ts` - Borrow, repay, loan queries

### Pages
- `/dashboard` - Overview
- `/deposit` - Add liquidity
- `/request-loan` - Borrow
- `/repay` - Repay loan

### Old P2P Code (to be removed)
- `frontend/lib/loans.ts` - Old P2P functions
- `frontend/app/loans/page.tsx` - Old marketplace
- `loan_requests` table - Old P2P table

## Next Steps

1. Test full flow: Signup → Deposit → Borrow → Repay
2. Verify pool accounting is correct
3. Remove old P2P code when ready
4. Integrate with smart contracts
5. Add interest distribution to lenders
6. Add liquidation logic for defaults

## Smart Contract Integration (Future)

Current service functions will map to contract calls:

```typescript
// Current
await depositToPool(userId, amount);
await borrowFromPool(borrowerId, amount, days);
await repayLoan(loanId, borrowerId);

// Future
await lendingPoolContract.deposit(amount);
await loanManagerContract.borrow(amount, days);
await loanManagerContract.repay(loanId);
```

All pool accounting logic will move on-chain.
