-- NOT APPLIED. CEO reviews/applies before deployment. Founder: 09/11/2026 "Sim para as 5", decision 5.
begin;
create table public.recreate_likes (
  format_id text not null check (char_length(format_id) between 1 and 100),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (format_id, user_id)
);
create table public.recreate_reports (
  format_id text not null check (char_length(format_id) between 1 and 100),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('rights','unsafe','other')),
  created_at timestamptz not null default now(),
  primary key (format_id, user_id)
);
alter table public.recreate_likes enable row level security;
alter table public.recreate_reports enable row level security;
revoke all on public.recreate_likes, public.recreate_reports from public, anon, authenticated;
grant select, insert, update, delete on public.recreate_likes, public.recreate_reports to service_role;

-- Paid-only v1 (founder, 09/11 evening). Preserve clips.credits > 0 and existing request idempotency.
commit;
