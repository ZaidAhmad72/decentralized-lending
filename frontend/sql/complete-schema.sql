-- ============================================
-- COMPLETE POOL-BASED LENDING SYSTEM SCHEMA
-- ============================================

-- 1. PROFILES TABLE
-- Create or update profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  age int,
  reputation_score float default 0,
  wallet_address text,
  created_at timestamptz default now()
);

-- Update existing profiles table if it exists
alter table profiles add column if not exists reputation_score float default 0;
alter table profiles add column if not exists wallet_address text;

-- Drop old trust_score column if it exists (rename to reputation_score)
do $$ 
begin
  if exists(select 1 from information_schema.columns where table_name='profiles' and column_name='trust_score') then
    alter table profiles rename column trust_score to reputation_score;
  end if;
end $$;

-- RLS for profiles
alter table profiles enable row level security;

drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
  on profiles for select 
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile"
  on profiles for insert 
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
  on profiles for update 
  using (auth.uid() = id);


-- 2. POOL TABLE (single row, global liquidity)
create table if not exists pool (
  id int primary key default 1,
  total_liquidity numeric default 0 not null,
  total_borrowed numeric default 0 not null,
  created_at timestamptz default now(),
  constraint single_pool_row check (id = 1)
);

-- Initialize pool
insert into pool (id, total_liquidity, total_borrowed)
values (1, 0, 0)
on conflict (id) do nothing;

-- RLS for pool
alter table pool enable row level security;

drop policy if exists "Anyone can read pool" on pool;
create policy "Anyone can read pool" 
  on pool for select 
  using (true);

drop policy if exists "System can update pool" on pool;
create policy "System can update pool" 
  on pool for update 
  using (true);


-- 3. DEPOSITS TABLE
create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz default now()
);

-- RLS for deposits
alter table deposits enable row level security;

drop policy if exists "Users can view own deposits" on deposits;
create policy "Users can view own deposits"
  on deposits for select 
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own deposits" on deposits;
create policy "Users can insert own deposits"
  on deposits for insert 
  with check (auth.uid() = user_id);


-- 4. LOANS TABLE (pool-based, no lender_id)
create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  duration_days int not null check (duration_days > 0),
  interest_rate numeric not null default 0,
  status text default 'active' check (status in ('active', 'repaid', 'defaulted')),
  created_at timestamptz default now(),
  due_date timestamptz not null
);

-- RLS for loans
alter table loans enable row level security;

drop policy if exists "Users can view all loans" on loans;
create policy "Users can view all loans"
  on loans for select 
  using (true);

drop policy if exists "Users can create own loans" on loans;
create policy "Users can create own loans"
  on loans for insert 
  with check (auth.uid() = borrower_id);

drop policy if exists "Users can update own loans" on loans;
create policy "Users can update own loans"
  on loans for update 
  using (auth.uid() = borrower_id);


-- 5. TRANSACTIONS TABLE (audit log)
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('deposit', 'borrow', 'repay')),
  amount numeric not null check (amount > 0),
  related_loan_id uuid references loans(id) on delete set null,
  created_at timestamptz default now()
);

-- RLS for transactions
alter table transactions enable row level security;

drop policy if exists "Users can view own transactions" on transactions;
create policy "Users can view own transactions"
  on transactions for select 
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on transactions;
create policy "Users can insert own transactions"
  on transactions for insert 
  with check (auth.uid() = user_id);


-- 6. OLD P2P TABLE (keep for migration, can be dropped later)
create table if not exists loan_requests (
  id uuid primary key default gen_random_uuid(),
  borrower_id uuid references profiles(id) on delete cascade not null,
  lender_id uuid references profiles(id) on delete set null,
  amount numeric not null,
  purpose text not null,
  duration_days int not null,
  interest_rate numeric default 0,
  status text default 'pending' check (status in ('pending','funded','repaid','defaulted')),
  created_at timestamptz default now(),
  funded_at timestamptz,
  due_date timestamptz
);

-- RLS for loan_requests (old P2P table)
alter table loan_requests enable row level security;

drop policy if exists "Anyone can read loan_requests" on loan_requests;
create policy "Anyone can read loan_requests"
  on loan_requests for select 
  using (true);

drop policy if exists "Borrowers can insert own loans" on loan_requests;
create policy "Borrowers can insert own loans"
  on loan_requests for insert 
  with check (auth.uid() = borrower_id);

drop policy if exists "Anyone can update loans" on loan_requests;
create policy "Anyone can update loans"
  on loan_requests for update 
  using (true);


-- 7. INDEXES for performance
create index if not exists idx_deposits_user_id on deposits(user_id);
create index if not exists idx_deposits_created_at on deposits(created_at desc);

create index if not exists idx_loans_borrower_id on loans(borrower_id);
create index if not exists idx_loans_status on loans(status);
create index if not exists idx_loans_due_date on loans(due_date);

create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_type on transactions(type);
create index if not exists idx_transactions_created_at on transactions(created_at desc);

create index if not exists idx_loan_requests_borrower_id on loan_requests(borrower_id);
create index if not exists idx_loan_requests_status on loan_requests(status);


-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check pool initialization
-- SELECT * FROM pool;

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('profiles', 'pool', 'deposits', 'loans', 'transactions', 'loan_requests');

-- Check RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
