-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).

create table if not exists file_flags (
  path text primary key,
  hidden boolean not null default false,
  locked boolean not null default false
);

create table if not exists passcodes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  label text default '',
  created_at timestamptz not null default now()
);

-- The app only holds the publishable (anon) key — every write to these
-- tables already goes through /api/admin, which checks ADMIN_PASSWORD before
-- it ever calls Supabase. RLS stays off here rather than layering a second,
-- redundant auth check the anon key can't satisfy without a service key.
alter table file_flags disable row level security;
alter table passcodes disable row level security;
