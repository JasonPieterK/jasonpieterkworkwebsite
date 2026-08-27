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

create table if not exists download_counts (
  key text primary key,
  count integer not null default 0,
  last_at timestamptz not null default now()
);

-- Atomic upsert-increment — a plain upsert can't express "count = count + 1",
-- and two concurrent downloads doing select-then-update would race and drop one.
create or replace function increment_download(p_key text)
returns void as $$
begin
  insert into download_counts (key, count, last_at)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = download_counts.count + 1,
        last_at = now();
end;
$$ language plpgsql;

-- The app only holds the publishable (anon) key — every admin write already
-- goes through /api/admin, which checks ADMIN_PASSWORD before it ever touches
-- Supabase. RLS stays off here rather than layering a second, redundant auth
-- check the anon key can't satisfy without a service key. Download tracking
-- is intentionally open — it's anonymous counters, not admin data.
alter table file_flags disable row level security;
alter table passcodes disable row level security;
alter table download_counts disable row level security;
