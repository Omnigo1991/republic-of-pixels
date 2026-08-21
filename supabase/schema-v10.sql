-- Hype-Meter (21.08.2026): Ein-Klick-Stimmung pro Artikel.
-- Gleiche Bauart wie article_reactions - eine Stimme pro Konto und
-- Artikel, Lesen fuer alle, Schreiben nur fuers eigene Konto.
-- Im SQL-Editor einzeln ausfuehren.

create table if not exists public.hype_votes (
  article_slug text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  wert text not null check (wert in ('hype', 'kalt')),
  created_at timestamptz not null default now(),
  primary key (article_slug, user_id)
);

alter table public.hype_votes enable row level security;

create policy "hype_lesen_alle" on public.hype_votes
  for select using (true);

create policy "hype_schreiben_eigen" on public.hype_votes
  for insert with check (auth.uid() = user_id);

create policy "hype_aendern_eigen" on public.hype_votes
  for update using (auth.uid() = user_id);

create policy "hype_loeschen_eigen" on public.hype_votes
  for delete using (auth.uid() = user_id);
