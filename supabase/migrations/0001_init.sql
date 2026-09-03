-- Tracked — initial schema
-- profiles, goals, meals (+ RLS) and the meal-photos storage bucket.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles --
create table if not exists public.profiles (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  name                  text        not null default 'Friend',
  diet_plan             text        not null default 'My Plan',
  notifications_enabled boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ------------------------------------------------------------------- goals --
-- One row per user: calorie/macro/micro daily targets.
create table if not exists public.goals (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  calories   integer     not null default 2000,
  protein    integer     not null default 150,
  carbs      integer     not null default 220,
  fat        integer     not null default 65,
  fiber      integer     not null default 30,
  sugar      integer     not null default 50,
  sodium     integer     not null default 2300,
  potassium  integer     not null default 3500,
  calcium    integer     not null default 1000,
  iron       integer     not null default 18,
  vitamin_c  integer     not null default 90,
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------- meals --
create table if not exists public.meals (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users (id) on delete cascade,
  name       text        not null,
  description text,
  photo_url  text,
  calories   integer     not null default 0,
  protein    integer     not null default 0,
  carbs      integer     not null default 0,
  fat        integer     not null default 0,
  fiber      integer     not null default 0,
  sugar      integer     not null default 0,
  sodium     integer     not null default 0,
  potassium  integer     not null default 0,
  calcium    integer     not null default 0,
  iron       integer     not null default 0,
  vitamin_c  integer     not null default 0,
  logged_at  timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists meals_user_logged_at_idx
  on public.meals (user_id, logged_at desc);

-- --------------------------------------------------------------------- RLS --
alter table public.profiles enable row level security;
alter table public.goals    enable row level security;
alter table public.meals    enable row level security;

drop policy if exists "profiles are self-service" on public.profiles;
create policy "profiles are self-service" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "goals are self-service" on public.goals;
create policy "goals are self-service" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "meals are self-service" on public.meals;
create policy "meals are self-service" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------- new-user bootstrap rows --
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, diet_plan)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'diet_plan', ''), 'My Plan')
  )
  on conflict (user_id) do nothing;

  insert into public.goals (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- storage --
-- Public read (meal photo URLs are stored on the meal row); writes are scoped
-- to the owner's own `<user_id>/…` folder.
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "meal photos are publicly readable" on storage.objects;
create policy "meal photos are publicly readable" on storage.objects
  for select using (bucket_id = 'meal-photos');

drop policy if exists "users upload their own meal photos" on storage.objects;
create policy "users upload their own meal photos" on storage.objects
  for insert with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own meal photos" on storage.objects;
create policy "users delete their own meal photos" on storage.objects
  for delete using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
