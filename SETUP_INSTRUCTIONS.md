# Setup Instructions for Advanced Credit Scoring System

## Database Migration Required

You need to run the SQL migration to add the `repaid_at` column to the loans table.

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Run Migration SQL
Copy and paste this SQL:

```sql
-- Add repaid_at column to loans table for tracking on-time repayments
-- This is needed for the advanced credit scoring system

alter table loans add column if not exists repaid_at timestamptz;

-- Update existing repaid loans to have a repaid_at timestamp
-- (set to created_at + duration as a fallback for historical data)
update loans 
set repaid_at = created_at + (duration_days || ' days')::interval
where status = 'repaid' and repaid_at is null;
```

Or run the file directly:
```bash
# From the frontend directory
cat sql/add-repaid-at-column.sql
```

### Step 3: Verify Migration
Run this query to verify the column was added:

```sql
select column_name, data_type 
from information_schema.columns 
where table_name = 'loans' and column_name = 'repaid_at';
```

You should see:
```
column_name | data_type
repaid_at   | timestamp with time zone
```

## What Changed

### 1. Removed Fixed Reputation Points
- ❌ Old: "Repaying on time earns you +10 reputation points"
- ✅ New: "Credit score impact: Positive ✓" (formula-based)

### 2. Enhanced Score Breakdown
The score breakdown now shows:
- **Factor values** with units (%, x, etc.)
- **Weight percentages** for each factor
- **Detailed tooltips** explaining each factor
- **Weighted sum** before sigmoid transformation
- **Final score** after sigmoid mapping

### 3. Dynamic Credit Score Calculation
Your credit score is now calculated using:
- **Repayment Reliability (30%)**: On-time repayment rate
- **Wallet History (20%)**: Account age with logarithmic scaling
- **Liquidity Strength (20%)**: Assets vs borrowed ratio
- **Activity Score (20%)**: Transactions in last 30 days
- **Default Risk (-10%)**: Penalty for defaults

### 4. Repay Page Updates
- Removed green "Reputation Boost" box
- Changed "Reputation gain: +10 PTS" to "Credit score impact: Positive ✓"
- Added explanation of how repayment affects score
- Success message now says "Credit Score Updated" instead of "+10 Reputation"

## Testing the System

### Test 1: New User Score
1. Create a new user account
2. Check dashboard - should show score: 500 (Fair tier)

### Test 2: Deposit Impact
1. Make a deposit to the pool
2. Check dashboard - score should recalculate
3. Click "Show Details" to see breakdown
4. Liquidity Strength and Activity Score should increase

### Test 3: Borrow Impact
1. Request a loan
2. Score recalculates
3. Total Loans increases
4. Liquidity Strength may decrease (if borrowed amount is high)

### Test 4: On-Time Repayment
1. Repay loan before due date
2. Score recalculates
3. Repayment Reliability increases (30% weight - biggest impact!)
4. Activity Score increases

### Test 5: Score Breakdown
1. Go to dashboard
2. Find the Credit Score card
3. Click "Show Details"
4. You should see:
   - All 5 factors with values and weights
   - Contribution of each factor
   - Weighted sum
   - Final score

## Troubleshooting

### Error: "Could not find the 'repaid_at' column"
**Solution**: Run the migration SQL (Step 1-2 above)

### Error: "Could not find the 'credit_score' column"
**Solution**: The column exists but might be cached. Try:
1. Refresh the page
2. Clear browser cache
3. Verify in Supabase that the column exists

### Score not updating after actions
**Solution**: 
1. Check browser console for errors
2. Verify all trigger points are working
3. Score is cached for 1 minute - wait and refresh

### Score shows as 0 or undefined
**Solution**:
1. Ensure reputation row exists for user
2. Run: `INSERT INTO reputation (user_id, credit_score) VALUES ('your-user-id', 500) ON CONFLICT (user_id) DO NOTHING;`

## Performance Notes

- Score calculation is cached for 60 seconds
- Recalculation only happens on trigger events (deposit, borrow, repay, default)
- Calculation time should be < 10ms
- No heavy loops or blocking operations

## Next Steps

1. ✅ Run database migration
2. ✅ Test new user flow
3. ✅ Test deposit → borrow → repay cycle
4. ✅ Verify score breakdown displays correctly
5. ✅ Check dark mode compatibility
6. ✅ Test on mobile devices
