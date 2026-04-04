-- Add repaid_at column to loans table for tracking on-time repayments
-- This is needed for the advanced credit scoring system

alter table loans add column if not exists repaid_at timestamptz;

-- Update existing repaid loans to have a repaid_at timestamp
-- (set to created_at + duration as a fallback for historical data)
update loans 
set repaid_at = created_at + (duration_days || ' days')::interval
where status = 'repaid' and repaid_at is null;
