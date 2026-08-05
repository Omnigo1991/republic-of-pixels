-- Republic of Pixels — Schema v4 (05.08.2026, abends)
-- Einmalig im Supabase SQL-Editor ausführen (nach schema-v2/v3).
-- Inhalt: eigenes, cookieloses Seitenaufruf-Tracking für das
-- Redaktions-Statistik-Cockpit (/redaktion/statistik).

create table public.page_views (
  id bigint generated always as identity primary key,
  path text not null check (char_length(path) <= 300),
  visitor text not null check (char_length(visitor) <= 64),
  created_at timestamptz not null default now()
);

create index page_views_zeit_idx on public.page_views (created_at desc);
create index page_views_pfad_idx on public.page_views (path, created_at desc);

alter table public.page_views enable row level security;

-- Jeder Besucher darf Aufrufe schreiben (anonym, ohne Konto)
create policy "Aufrufe erfassen"
  on public.page_views for insert with check (true);

-- Lesen darf ausschliesslich der Redaktions-Account
create policy "Nur Redaktion liest Statistiken"
  on public.page_views for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and nickname = 'republicofpixels'
    )
  );
