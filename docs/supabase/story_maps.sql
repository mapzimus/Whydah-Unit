-- Optional upgrade: dedicated story_maps table for Map Studio class saves.
-- Map Studio currently stores class maps in the existing public `photos` storage
-- bucket under prefix story-maps/v1/ (works with the publishable anon key today).
-- Run this in the Supabase SQL editor if you later want a proper table instead.

create table if not exists public.story_maps (
  id text primary key,
  name text not null,
  student text not null default '',
  person text not null default '',
  pin_count integer not null default 0,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

alter table public.story_maps enable row level security;

-- Classroom model: any Chromebook may list / save / update / soft-delete.
-- (Same trust model as anonymous photo uploads for this unit.)
drop policy if exists "story_maps_select" on public.story_maps;
create policy "story_maps_select" on public.story_maps
  for select to anon, authenticated using (true);

drop policy if exists "story_maps_insert" on public.story_maps;
create policy "story_maps_insert" on public.story_maps
  for insert to anon, authenticated with check (true);

drop policy if exists "story_maps_update" on public.story_maps;
create policy "story_maps_update" on public.story_maps
  for update to anon, authenticated using (true) with check (true);

grant select, insert, update on public.story_maps to anon, authenticated;
