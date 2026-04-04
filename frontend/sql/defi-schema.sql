-- ============================================
-- DEFI ARCHITECTURE SCHEMA v2
-- Share-based pool + Reputation system
-- Solidity-ready structure
-- ============================================

-- 1. PROFILES (wallet + identity)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  age int,
  wallet_address text,
  wallet_balance numeric default 2.0 not null check (wallet_balance >= 0),
  created_at timestamptz default now()
);

alter table profiles add column if not exists wallet_address text;
alter table profiles add column if not exists wallet_balance numeric default 2.0;

-- RLS
alter table profiles enable row level security;
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);


-- 2. POOL (share-based, single row — maps to LendingPool.sol)
create table if not exists pool (
  id int primary key default 1,
  total_liquidity numeric default 0 not null,   -- total deposited (never decreases on borrow)
  total_borrowed  numeric default 0 not null,   -- active borrows
  total_shares    numeric default 0 not null,   -- ERC-4626 style share tracking
  created_at timestamptz default now(),
  constraint single_pool_row check (id = 1)
);

insert into pool (id, total_liquidity, total_borrowed, total_shares)
values (1, 0, 0, 0)
on conflict (id) do nothing;

alter table pool add column if not exists total_shares numeric default 0 not null;

alter table pool enable row level security;
drop policy if exists "Anyone can read pool" on pool;
create policy "Anyone can read pool" on pool for select using (true);
drop policy if exists "System can update pool" on pool;
create policy "System can update pool" on pool for update using (true);


-- 3. USER_SHARES (maps to shares mapping in LendingPool.sol)
create table if not exists user_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null unique,
  shares numeric default 0 not null check (shares >= 0),
  updated_at timestamptz default now()
);

alter table user_shares enable row level security;
drop policy if exists "Users can view own shares" on user_shares;
create policy "Users can view own shares" on user_shares for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own shares" on user_shares;
create policy "Users can insert own shares" on user_shares for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own shares" on user_shares;
create policy "Users can update own shares" on user_shares for update using (auth.uid() = user_id);


-- 4. DEPOSITS (audit log for deposits)
create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  shares_minted numeric not null default 0,
  created_at timestamptz default now()
);

alter table deposits add column if not exists shares_minted numeric not null default 0;

alter table deposits enable row level security;
drop policy if exists "Users can view own deposits" on deposits;
create policy "Users can view own deposits" on deposits for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own deposits" on deposits;
create policy "Users can insert own deposits" on deposits for insert with check (auth.uid() = user_id);


-- 5. LOANS (maps to LoanManager.sol)
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  duration_days int not null check (duration_days > 0),
  interest_rate numeric not null default 0.024,  -- daily % rate
  status text default 'active' check (status in ('active', 'repaid', 'defaulted')),
  created_at timestamptz default now(),
  due_date timestamptz not null
);

alter table loans enable row level security;
drop policy if exists "Users can view all loans" on loans;
create policy "Users can view all loans" on loans for select using (true);
drop policy if exists "Users can create own loans" on loans;
create policy "Users can create own loans" on loans for insert with check (auth.uid() = borrower_id);
drop policy if exists "Users can update own loans" on loans;
create policy "Users can update own loans" on loans for update using (auth.uid() = borrower_id);


-- 6. REPUTATION (maps to Reputation.sol)
create table if not exists reputation (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null unique,
  credit_score int default 500 not null check (credit_score >= 0 and credit_score <= 1000),
  total_loans int default 0 not null,
  successful_repayments int default 0 not null,
  defaults int default 0 not null,
  total_borrowed_amount numeric default 0 not null,
  updated_at timestamptz default now()
);

alter table reputation enable row level security;
drop policy if exists "Users can view own reputation" on reputation;
create policy "Users can view own reputation" on reputation for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own reputation" on reputation;
create policy "Users can insert own reputation" on reputation for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own reputation" on reputation;
create policy "Users can update own reputation" on reputation for update using (auth.uid() = user_id);
-- Allow reading all reputations (for LTV checks)
drop policy if exists "Anyone can read reputation" on reputation;
create policy "Anyone can read reputation" on reputation for select using (true);


-- 7. TRANSACTIONS (audit log)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('deposit', 'borrow', 'repay', 'withdraw')),
  amount numeric not null check (amount > 0),
  related_loan_id uuid references loans(id) on delete set null,
  tx_hash text,
  created_at timestamptz default now()
);

alter table transactions add column if not exists tx_hash text;

alter table transactions enable row level security;
drop policy if exists "Users can view own transactions" on transactions;
create policy "Users can view own transactions" on transactions for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own transactions" on transactions;
create policy "Users can insert own transactions" on transactions for insert with check (auth.uid() = user_id);


-- 8. INDEXES
create index if not exists idx_user_shares_user_id on user_shares(user_id);
create index if not exists idx_deposits_user_id on deposits(user_id);
create index if not exists idx_loans_borrower_id on loans(borrower_id);
create index if not exists idx_loans_status on loans(status);
create index if not exists idx_loans_due_date on loans(due_date);
create index if not exists idx_reputation_user_id on reputation(user_id);
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_created_at on transactions(created_at desc);


-- ============================================
-- MIGRATE EXISTING DATA
-- ============================================

-- Seed reputation rows for existing profiles (default score 500)
insert into reputation (user_id, credit_score)
select id, 500 from profiles
where id not in (select user_id from reputation)
on conflict (user_id) do nothing;

-- ============================================
-- VERIFICATION
-- ============================================
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT * FROM pool;
-- SELECT * FROM reputation LIMIT 5;
