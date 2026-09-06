-- Tracked — bodyweight tracking
-- One entry per calendar day, stored canonically in kilograms; the display
-- unit is a per-user preference so the numbers never get mixed up.

create table if not exists public.weights (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  -- The user's *local* calendar day, decided by the phone, not the server.
  logged_on  date        not null,
  weight_kg  numeric(6,2) not null check (weight_kg > 0 and weight_kg < 700),
  created_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

create index if not exists weights_user_day_idx
  on public.weights (user_id, logged_on desc);

alter table public.weights enable row level security;

drop policy if exists "weights are self-service" on public.weights;
create policy "weights are self-service" on public.weights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Display preference: 'lb' or 'kg'.
alter table public.profiles
  add column if not exists weight_unit text not null default 'lb'
  check (weight_unit in ('lb', 'kg'));
