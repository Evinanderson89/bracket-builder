-- Shared app state store for Bracket Builder
-- Run this in Supabase SQL Editor before launching production.

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- For this client-only app, anon access is required unless you move to server-side API auth.
alter table public.app_state disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.app_state to anon, authenticated;
