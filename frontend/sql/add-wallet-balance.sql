-- ============================================
-- ADD WALLET BALANCE TO PROFILES
-- ============================================

-- Add wallet_balance column (default 2.0 ETH for demo)
alter table profiles add column if not exists wallet_balance numeric default 2.0 not null;

-- Update existing users to have 2.0 ETH
update profiles set wallet_balance = 2.0 where wallet_balance is null;

-- Add check constraint (balance cannot be negative)
alter table profiles add constraint check_wallet_balance_positive check (wallet_balance >= 0);

-- Verify
-- SELECT id, name, wallet_address, wallet_balance FROM profiles;
