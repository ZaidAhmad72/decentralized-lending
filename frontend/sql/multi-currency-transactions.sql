-- ============================================
-- MULTI-CURRENCY TRANSACTION SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Add new columns to transactions table
ALTER TABLE transactions 
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'ETH',
  ADD COLUMN IF NOT EXISTS amount_original NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_eth NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- 2. Add currency constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS valid_currency_check;
ALTER TABLE transactions ADD CONSTRAINT valid_currency_check 
  CHECK (currency IN ('ETH','BTC','USDC','USDT','BNB','SOL','XRP','DOGE','PEPE','BONK'));

-- 3. Drop old type constraint and add new one with 'withdraw'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('deposit', 'borrow', 'repay', 'withdraw'));

-- 4. Migrate old data: treat old 'amount' as INR, set currency=ETH
--    Old rows have no tx_hash, so we can identify them
UPDATE transactions 
SET 
  currency = 'ETH',
  amount_original = amount,
  amount_eth = amount
WHERE amount_original = 0;

-- 5. Verify
SELECT id, type, currency, amount_original, amount_eth, tx_hash, created_at 
FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;
