-- Republic of Pixels — Schema v6 (06.08.2026)
-- Einmalig im Supabase SQL-Editor ausführen (nach schema-v5).
-- Inhalt: persönliche Merkliste (verfolgte Themen/Spiele-Tags) für
-- eingeloggte Nutzer:innen.

create table public.watchlist (
  user_id uuid not null references public.profiles (id) on delete cascade,
  tag text not null check (char_length(tag) <= 60),
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);

alter table public.watchlist enable row level security;

-- Jede Person verwaltet ausschliesslich ihre eigene Merkliste.
create policy "Eigene Merkliste lesen"
  on public.watchlist for select using (auth.uid() = user_id);
create policy "Eigene Merkliste ergänzen"
  on public.watchlist for insert with check (auth.uid() = user_id);
create policy "Eigene Merkliste bereinigen"
  on public.watchlist for delete using (auth.uid() = user_id);
