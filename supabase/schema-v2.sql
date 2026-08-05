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
