-- ============================================================
-- FASE 1 — identidade do jogador
-- profiles + player_state, com RLS desde o primeiro dia.
-- Rode no SQL Editor do Supabase (ou via supabase db push).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique references auth.users (id) on delete cascade,
  display_name         text,
  avatar_url           text,
  onboarding_completed boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ------------------------------------------------------------
-- player_state — exatamente uma linha por jogador
-- ------------------------------------------------------------
create table if not exists public.player_state (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  level      integer not null default 1 check (level >= 1),
  xp         integer not null default 0 check (xp >= 0),
  currency   integer not null default 0 check (currency >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- updated_at automatico
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists player_state_touch on public.player_state;
create trigger player_state_touch
  before update on public.player_state
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- Sem isso, a anon key exposta no frontend leria a base inteira.
-- As policies comparam auth.uid() — nunca o user_id enviado pela interface.
-- ------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.player_state enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = user_id);

drop policy if exists player_state_select_own on public.player_state;
create policy player_state_select_own on public.player_state
  for select using (auth.uid() = user_id);

drop policy if exists player_state_insert_own on public.player_state;
create policy player_state_insert_own on public.player_state
  for insert with check (auth.uid() = user_id);

drop policy if exists player_state_update_own on public.player_state;
create policy player_state_update_own on public.player_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists player_state_delete_own on public.player_state;
create policy player_state_delete_own on public.player_state
  for delete using (auth.uid() = user_id);
