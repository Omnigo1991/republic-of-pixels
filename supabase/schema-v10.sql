-- Republic of Pixels — Schema v10 (14.08.2026)
-- Einmalig im Supabase SQL-Editor ausführen (nach schema-v9).
--
-- WARUM (Tim, 14.08.2026): "Irgendwie habe ich das Gefühl, dass die Daten
-- nicht immer korrekt sind. Manchmal wächst das eine, aber das andere bleibt
-- gleich."
--
-- Beim Nachgehen kam derselbe Fehler heraus wie am 13.08. — nur an einer
-- Stelle, die ich damals nicht mitgezogen habe.
--
-- schema-v9 hat die AUSWAHL "erster Aufruf je Besucher" in die Datenbank
-- verlegt, aber die Funktion liefert weiterhin EINE ZEILE PRO BESUCHER an den
-- Browser, der sie dort nach Quellen gruppiert. Damit hängt das Ergebnis
-- wieder an der Zeilengrenze der Schnittstelle: Sobald mehr Besucher im
-- Fenster liegen als eine Antwort Zeilen ausliefert, zählt die
-- Herkunfts-Tabelle zu wenig — und ihre Summe passt nicht mehr zur Kachel
-- "Besucher 7 Tage" darüber. Genau so ein Auseinanderlaufen zweier Zahlen,
-- die zusammengehören.
--
-- LÖSUNG: Auch das Gruppieren macht die Datenbank. Zurück kommen nur noch so
-- viele Zeilen, wie es verschiedene Referrer gibt — ein paar Dutzend statt
-- Tausender. Das ist unabhängig von jeder Zeilengrenze.
--
-- Die Zuordnung "Referrer -> Quelle" bleibt bewusst im Frontend (quelleVon),
-- damit diese Regeln an EINER Stelle stehen und nicht doppelt gepflegt
-- werden müssen. Darum liefert die Funktion den rohen Referrer plus das
-- Kennzeichen "war der erste Aufruf /ig" — mehr braucht quelleVon nicht.
--
-- SICHERHEIT unverändert: security invoker, die Leseregel aus schema-v4 gilt
-- weiter, Zahlen sieht ausschliesslich der Redaktions-Account.

-- Rückgabetyp ändert sich, darum erst entfernen (create or replace kann das
-- nicht). Die alte Fassung wird nicht mehr aufgerufen.
drop function if exists public.statistik_herkunft(timestamptz);

create function public.statistik_herkunft(seit timestamptz)
returns table (referrer text, ist_ig boolean, besucher integer)
language sql
stable
security invoker
set search_path = public
as $$
  with erste as (
    select distinct on (visitor) visitor, referrer, path
    from public.page_views
    where created_at >= seit
    order by visitor, created_at asc
  )
  select
    erste.referrer,
    (erste.path = '/ig') as ist_ig,
    count(*)::int as besucher
  from erste
  group by 1, 2
  order by 3 desc;
$$;

grant execute on function public.statistik_herkunft(timestamptz) to authenticated;

-- PRÜFZAHL FÜR DAS COCKPIT.
--
-- Die Summe der Herkunft muss exakt der Kachel "Besucher 7 Tage" entsprechen
-- — beides ist "verschiedene Besucher im selben Fenster". Damit das Cockpit
-- das selbst nachrechnen kann, ohne eine zweite Abfrage zu bauen, liefert
-- diese Funktion beide Werte aus derselben Quelle.
--
-- WARUM ÜBERHAUPT: Am 13.08. stand "Besucher 7 Tage" höher als "Besucher
-- gesamt" — rechnerisch unmöglich, und niemandem wäre es aufgefallen, wenn
-- Tim nicht hingesehen hätte. Eine Zahl, die niemand nachrechnet, ist eine
-- Zahl, der man nicht trauen kann.
create or replace function public.statistik_pruefung(seit timestamptz)
returns table (besucher_fenster integer, herkunft_summe integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (select count(distinct visitor)::int
       from public.page_views where created_at >= seit),
    (select count(*)::int from (
       select distinct on (visitor) visitor
       from public.page_views
       where created_at >= seit
       order by visitor, created_at asc
     ) t);
$$;

grant execute on function public.statistik_pruefung(timestamptz) to authenticated;
