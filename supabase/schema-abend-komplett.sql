-- Republic of Pixels — Schema v2 (05.08.2026)
-- Einmalig im Supabase SQL-Editor ausführen (wie schema.sql).
-- Inhalt: 1) Artikel-Reaktionen  2) endgültiges Löschen eigener Kommentare
--         3) Aufräumen: bisher soft-gelöschte Kommentare entfernen

-- ===== 1) Artikel-Reaktionen (eine Reaktion pro Person und Artikel) =====
create table public.article_reactions (
  article_slug text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('gefaellt', 'liebe', 'gefaellt_nicht', 'enttaeuschend')),
  created_at timestamptz not null default now(),
  primary key (article_slug, user_id)
);

alter table public.article_reactions enable row level security;

create policy "Reaktionen sind öffentlich lesbar"
  on public.article_reactions for select using (true);
create policy "Eigene Reaktion setzen"
  on public.article_reactions for insert with check (auth.uid() = user_id);
create policy "Eigene Reaktion ändern"
  on public.article_reactions for update using (auth.uid() = user_id);
create policy "Eigene Reaktion entfernen"
  on public.article_reactions for delete using (auth.uid() = user_id);

-- ===== 2) Eigene Kommentare dürfen endgültig gelöscht werden =====
create policy "Eigene Kommentare endgültig löschen"
  on public.comments for delete using (auth.uid() = author_id);

-- ===== 3) Bisherige Soft-Delete-Kommentare endgültig entfernen =====
delete from public.comments where deleted = true;
-- Republic of Pixels — Schema v3 (05.08.2026, abends)
-- Einmalig im Supabase SQL-Editor ausführen (nach schema-v2.sql).
-- Inhalt: Speicher-Bucket für selbst hochgeladene Profilbilder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']);

create policy "Avatare sind öffentlich lesbar"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Eigenen Avatar hochladen"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Eigenen Avatar ersetzen"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Eigenen Avatar löschen"
  on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
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
