-- ============================================
-- FIX TRANSACTIONS TABLE
-- Adds tx_hash column and withdraw type
-- ============================================

-- 1. Add tx_hash column if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tx_hash text;

-- 2. Drop old type constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- 3. Add new type constraint with 'withdraw' included
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('deposit', 'borrow', 'repay', 'withdraw'));

-- 4. Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';
