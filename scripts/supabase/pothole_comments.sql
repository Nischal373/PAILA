-- Pothole comments table + policies
-- Run in Supabase SQL editor after creating public.potholes.

create extension if not exists pgcrypto;

create table if not exists public.pothole_comments (
  id uuid primary key default gen_random_uuid(),
  pothole_id uuid not null references public.potholes(id) on delete cascade,
  author text,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists pothole_comments_pothole_id_created_at_idx
  on public.pothole_comments (pothole_id, created_at desc);

alter table public.pothole_comments enable row level security;

drop policy if exists "public read comments" on public.pothole_comments;
create policy "public read comments"
  on public.pothole_comments
  for select
  using (true);

drop policy if exists "server writes comments" on public.pothole_comments;
create policy "server writes comments"
  on public.pothole_comments
  for insert
  with check (auth.role() = 'service_role');

drop policy if exists "server deletes comments" on public.pothole_comments;
create policy "server deletes comments"
  on public.pothole_comments
  for delete
  using (auth.role() = 'service_role');
