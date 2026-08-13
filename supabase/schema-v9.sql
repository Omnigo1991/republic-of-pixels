-- Republic of Pixels — Schema v9 (13.08.2026)
-- Einmalig im Supabase SQL-Editor ausführen (nach schema-v8).
--
-- WARUM (Tim, 13.08.2026): Im Statistik-Cockpit stand "Besucher 7 Tage"
-- höher als "Besucher gesamt". Das ist rechnerisch unmöglich — eine
-- Teilmenge hat nie mehr verschiedene Besucher als die Gesamtmenge. Also
-- hat die Gesamt-Abfrage nicht alle Zeilen gesehen.
--
-- URSACHE: Das Cockpit holte für "eindeutige Besucher" die ROH-ZEILEN aus
-- page_views und zählte sie im Browser. Supabase liefert pro Abfrage aber
-- nur eine begrenzte Zahl Zeilen aus, und ohne Sortierung sind das die
-- ÄLTESTEN. Die Gesamt-Abfrage sah damit die ersten Tage nach dem Start
-- (kaum Besucher), die 7-Tage-Abfrage dagegen aktuelle Zeilen (viele
-- Besucher). Dieselbe Konstruktion steckte in der Wachstumskurve und in der
-- Herkunfts-Auswertung — beide zeigten zu niedrige Werte.
--
-- LÖSUNG: Gezählt wird jetzt in der Datenbank. Damit gibt es keine
-- Zeilengrenze mehr, und es bleibt auch bei 100 000 Aufrufen richtig.
--
-- SICHERHEIT: Alle drei Funktionen laufen mit "security invoker" — die
-- Leseregel aus schema-v4 gilt unverändert weiter, Zahlen sieht
-- ausschliesslich der Redaktions-Account.

-- Eindeutige Besucher. seit = null bedeutet: über den gesamten Zeitraum.
create or replace function public.statistik_besucher(seit timestamptz default null)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  select count(distinct visitor)::int
  from public.page_views
  where seit is null or created_at >= seit;
$$;

-- Tagesverlauf für die Wachstumskurve. Gruppiert nach Zürcher Kalendertag,
-- nicht nach UTC — sonst wandern Abendaufrufe in den Folgetag.
create or replace function public.statistik_verlauf(von timestamptz)
returns table (tag date, aufrufe integer, besucher integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (created_at at time zone 'Europe/Zurich')::date as tag,
    count(*)::int as aufrufe,
    count(distinct visitor)::int as besucher
  from public.page_views
  where created_at >= von
  group by 1
  order by 1;
$$;

-- Herkunft: pro Besucher der ERSTE Aufruf im Fenster. Die Zuordnung
-- Referrer -> Quelle bleibt bewusst im Frontend (quelleVon), damit die
-- Regeln an einer Stelle stehen.
create or replace function public.statistik_herkunft(seit timestamptz)
returns table (visitor text, referrer text, path text)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct on (visitor) visitor, referrer, path
  from public.page_views
  where created_at >= seit
  order by visitor, created_at asc;
$$;

grant execute on function public.statistik_besucher(timestamptz) to authenticated;
grant execute on function public.statistik_verlauf(timestamptz) to authenticated;
grant execute on function public.statistik_herkunft(timestamptz) to authenticated;
