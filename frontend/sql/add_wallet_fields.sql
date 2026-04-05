-- Run this in the Supabase SQL editor before deploying the wallet changes.
-- Safe to run multiple times (IF NOT EXISTS guards).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS encrypted_keystore TEXT,
  ADD COLUMN IF NOT EXISTS wallet_created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS polygon_address TEXT;

-- Indexes for fast address lookups
CREATE INDEX IF NOT EXISTS profiles_wallet_address_idx
  ON profiles (wallet_address);

CREATE INDEX IF NOT EXISTS profiles_polygon_address_idx
  ON profiles (polygon_address);
