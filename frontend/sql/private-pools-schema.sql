-- ============================================================
-- Private Pool System — Full Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Private Pools
CREATE TABLE IF NOT EXISTS private_pools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  pool_name TEXT NOT NULL,
  join_code TEXT UNIQUE NOT NULL,
  requires_approval BOOLEAN DEFAULT false,
  max_members INT DEFAULT 10,
  total_liquidity NUMERIC DEFAULT 0,
  total_borrowed NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pool Members
CREATE TABLE IF NOT EXISTS pool_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES private_pools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('creator','member')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','pending','rejected')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, user_id)
);

-- 3. Pool Loans
CREATE TABLE IF NOT EXISTS pool_loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES private_pools(id) ON DELETE CASCADE,
  borrower_id UUID REFERENCES profiles(id),
  amount NUMERIC NOT NULL,
  duration_days INT NOT NULL DEFAULT 7,
  interest_rate NUMERIC DEFAULT 0.024,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','repaid','defaulted')),
  borrowed_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ NOT NULL,
  repaid_at TIMESTAMPTZ
);

-- 4. Pool Transactions
CREATE TABLE IF NOT EXISTS pool_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES private_pools(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('deposit','borrow','repay','withdraw')),
  amount NUMERIC NOT NULL,
  related_loan_id UUID REFERENCES pool_loans(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Interactions (for abuse detection)
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pool_id UUID REFERENCES private_pools(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES profiles(id),
  borrower_id UUID REFERENCES profiles(id),
  interaction_count INT DEFAULT 1,
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, lender_id, borrower_id)
);

-- 6. Borrow Cooldowns (anti-abuse)
CREATE TABLE IF NOT EXISTS borrow_cooldowns (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  pool_id UUID REFERENCES private_pools(id),
  last_borrow_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pool_members_pool ON pool_members(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_members_user ON pool_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pool_loans_pool ON pool_loans(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_loans_borrower ON pool_loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_pool_transactions_pool ON pool_transactions(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_transactions_user ON pool_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_pair ON user_interactions(lender_id, borrower_id);

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE private_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only see pools they are members of
CREATE POLICY "pool_members_see_own_pools" ON private_pools
  FOR SELECT USING (
    id IN (
      SELECT pool_id FROM pool_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can create pools
CREATE POLICY "pool_create" ON private_pools
  FOR INSERT WITH CHECK (creator_id = auth.uid());

-- Creator can update their pool
CREATE POLICY "pool_creator_update" ON private_pools
  FOR UPDATE USING (creator_id = auth.uid());

-- Members can see pool_members of their pools
CREATE POLICY "pool_members_visible" ON pool_members
  FOR SELECT USING (
    pool_id IN (
      SELECT pool_id FROM pool_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can join pools (insert themselves)
CREATE POLICY "pool_members_join" ON pool_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Creator can approve/reject members
CREATE POLICY "pool_members_approve" ON pool_members
  FOR UPDATE USING (
    pool_id IN (
      SELECT id FROM private_pools WHERE creator_id = auth.uid()
    )
  );

-- Members can see loans in their pools
CREATE POLICY "pool_loans_visible" ON pool_loans
  FOR SELECT USING (
    pool_id IN (
      SELECT pool_id FROM pool_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Members can insert loans
CREATE POLICY "pool_loans_insert" ON pool_loans
  FOR INSERT WITH CHECK (
    borrower_id = auth.uid() AND
    pool_id IN (
      SELECT pool_id FROM pool_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Members can see transactions in their pools
CREATE POLICY "pool_transactions_visible" ON pool_transactions
  FOR SELECT USING (
    pool_id IN (
      SELECT pool_id FROM pool_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );
