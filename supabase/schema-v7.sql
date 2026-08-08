-- schema-v7 (08.08.2026): Community-Umfragen pro Artikel (PollBox).
-- Eine Stimme pro anonymer Besucher-Kennung (dieselbe wie der
-- Besuchszähler); Ergebnisse werden nur aggregiert ausgeliefert.
-- Zusätzlich (bereits am 08.08. einzeln ausgeführt, hier dokumentiert):
--   alter table public.page_views add column if not exists referrer text;
--   create or replace view public.artikel_aufrufe … (siehe Verlauf)

create table if not exists public.article_poll_votes (
  id bigint generated always as identity primary key,
  article_slug text not null,
  option_index int not null check (option_index >= 0 and option_index < 8),
  visitor text not null,
  created_at timestamptz not null default now(),
  unique (article_slug, visitor)
);

alter table public.article_poll_votes enable row level security;

-- Jeder darf abstimmen (anonym); Ändern/Löschen ist niemandem erlaubt.
create policy "Abstimmen erlaubt"
  on public.article_poll_votes for insert
  to anon, authenticated
  with check (true);

-- Ergebnisse nur aggregiert (keine Besucher-Kennungen nach aussen).
create or replace view public.poll_ergebnisse as
  select article_slug, option_index, count(*)::int as stimmen
  from public.article_poll_votes
  group by 1, 2;

grant select on public.poll_ergebnisse to anon, authenticated;
