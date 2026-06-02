-- Lead storage for the AI Business Guide (aheadofmarket.com/ai-guide).
-- Part of corner:digital-products R3.
create table if not exists guide_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  category text,
  created_at timestamptz default now()
);

create index if not exists guide_leads_email_idx on guide_leads (email);
create index if not exists guide_leads_created_at_idx on guide_leads (created_at desc);
