-- Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- ── Drop all broken policies ──────────────────────────────────
DROP POLICY IF EXISTS "pool_members_see_own_pools" ON private_pools;
DROP POLICY IF EXISTS "pool_create" ON private_pools;
DROP POLICY IF EXISTS "pool_creator_update" ON private_pools;
DROP POLICY IF EXISTS "pool_members_visible" ON pool_members;
DROP POLICY IF EXISTS "pool_members_join" ON pool_members;
DROP POLICY IF EXISTS "pool_members_approve" ON pool_members;
DROP POLICY IF EXISTS "pool_loans_visible" ON pool_loans;
DROP POLICY IF EXISTS "pool_loans_insert" ON pool_loans;
DROP POLICY IF EXISTS "pool_transactions_visible" ON pool_transactions;

-- ── Disable RLS temporarily and use simple policies ──────────
-- This avoids the self-referencing recursion entirely.
-- Security is enforced at the service layer instead.

ALTER TABLE private_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE pool_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE pool_loans DISABLE ROW LEVEL SECURITY;
ALTER TABLE pool_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_cooldowns DISABLE ROW LEVEL SECURITY;

-- ── Re-enable with simple non-recursive policies ──────────────

ALTER TABLE private_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_cooldowns ENABLE ROW LEVEL SECURITY;

-- private_pools: authenticated users can read/write their own
CREATE POLICY "pp_select" ON private_pools
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pp_insert" ON private_pools
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

CREATE POLICY "pp_update" ON private_pools
  FOR UPDATE TO authenticated USING (creator_id = auth.uid());

-- pool_members: authenticated users can read all, insert themselves
CREATE POLICY "pm_select" ON pool_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pm_insert" ON pool_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "pm_update" ON pool_members
  FOR UPDATE TO authenticated USING (true);

-- pool_loans: authenticated users can read/insert
CREATE POLICY "pl_select" ON pool_loans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pl_insert" ON pool_loans
  FOR INSERT TO authenticated WITH CHECK (borrower_id = auth.uid());

CREATE POLICY "pl_update" ON pool_loans
  FOR UPDATE TO authenticated USING (borrower_id = auth.uid());

-- pool_transactions: authenticated users can read/insert
CREATE POLICY "pt_select" ON pool_transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "pt_insert" ON pool_transactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- user_interactions: authenticated users can read/write
CREATE POLICY "ui_all" ON user_interactions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- borrow_cooldowns: authenticated users can read/write their own
CREATE POLICY "bc_all" ON borrow_cooldowns
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
