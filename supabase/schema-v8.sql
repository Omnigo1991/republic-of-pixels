-- Schema v8 (09.08.2026): Pixel-Raten-Community-Statistik.
-- Ein Ergebnis pro Besucher-Kennung und Tag (anonymes rop_vid wie bei den
-- Artikel-Umfragen); die Komponente liest NUR die aggregierte View.
-- Ausführen im Supabase-SQL-Editor. Fehlt die Tabelle, blendet die
-- Komponente die Statistik-Zeile einfach aus — nichts bricht.

create table if not exists pixelraten_ergebnisse (
  id bigint generated always as identity primary key,
  datum date not null,
  visitor text not null,
  versuche smallint not null check (versuche between 1 and 5),
  geloest boolean not null,
  created_at timestamptz not null default now(),
  unique (datum, visitor)
);

alter table pixelraten_ergebnisse enable row level security;

-- Anonyme Besucher dürfen ihr Ergebnis EINMAL eintragen (Unique-Constraint
-- erzwingt die Einmaligkeit serverseitig), aber keine Rohdaten lesen.
create policy "pixelraten_insert_anon" on pixelraten_ergebnisse
  for insert to anon with check (true);

-- Aggregierte Tages-Statistik für die Komponente.
create or replace view pixelraten_statistik
  with (security_invoker = off) as
select
  datum,
  count(*)::int as teilnehmer,
  round(100.0 * count(*) filter (where geloest) / count(*))::int as geloest_prozent,
  round(avg(versuche)::numeric, 1)::float as schnitt_versuche
from pixelraten_ergebnisse
group by datum;

grant select on pixelraten_statistik to anon;
