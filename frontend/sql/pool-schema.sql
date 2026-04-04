-- ============================================
-- PEER-TO-POOL LENDING SYSTEM SCHEMA
-- ============================================

-- Profiles table (already exists, just ensure these columns)
alter table profiles add column if not exists reputation_score float default 0;
alter table profiles add column if not exists wallet_address text;

-- Pool table (single row, global liquidity pool)
create table if not exists pool (
  id int primary key default 1,
  total_liquidity numeric default 0 not null,
  total_borrowed numeric default 0 not null,
  constraint single_pool_row check (id = 1)
);

-- Initialize pool if not exists
insert into pool (id, total_liquidity, total_borrowed)
values (1, 0, 0)
on conflict (id) do nothing;

-- Deposits table (tracks individual lender deposits)
create table if not exists deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  amount numeric not null check (amount > 0),
  created_at timestamptz default now()
);

-- Loans table (borrowers borrow from pool, no lender_id)
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

-- RLS policies
alter table pool enable row level security;
alter table deposits enable row level security;
alter table loans enable row level security;

-- Pool: anyone can read
create policy "Anyone can read pool" on pool for select using (true);
create policy "System can update pool" on pool for update using (true);

-- Deposits: users can insert own, read own
create policy "Users can insert own deposits" on deposits for insert with check (auth.uid() = user_id);
create policy "Users can read own deposits" on deposits for select using (auth.uid() = user_id);

-- Loans: borrowers can insert own, anyone can read
create policy "Borrowers can insert own loans" on loans for insert with check (auth.uid() = borrower_id);
create policy "Anyone can read loans" on loans for select using (true);
create policy "Borrowers can update own loans" on loans for update using (auth.uid() = borrower_id);

-- Indexes for performance
create index if not exists idx_deposits_user_id on deposits(user_id);
create index if not exists idx_loans_borrower_id on loans(borrower_id);
create index if not exists idx_loans_status on loans(status);
