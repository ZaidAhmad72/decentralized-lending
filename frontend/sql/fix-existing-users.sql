-- ============================================
-- FIX EXISTING USERS WITHOUT WALLET
-- ============================================

-- Generate wallet addresses for users who don't have one
update profiles
set wallet_address = '0x' || substring(replace(id::text, '-', ''), 1, 40)
where wallet_address is null;

-- Ensure all users have wallet balance
update profiles
set wallet_balance = 2.0
where wallet_balance is null or wallet_balance = 0;

-- Verify
SELECT id, name, wallet_address, wallet_balance FROM profiles;
