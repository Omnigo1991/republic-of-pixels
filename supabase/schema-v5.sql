-- Republic of Pixels — Schema v5 (05.08.2026)
-- Teil 1: JETZT im Supabase SQL-Editor ausführen (nach schema-v4).
-- Manuelles Bonus-Punkte-Feld (z. B. für Gewinnspiele/Geschenke), wird zu
-- den regulären, aktivitätsbasierten Punkten addiert.

alter table public.profiles
  add column if not exists bonus_punkte integer not null default 0;

-- Teil 2: ERST ausführen, NACHDEM Chiara ihren Nickname gewählt hat
-- (vorher existiert noch keine Zeile für sie in profiles).
--
-- update public.profiles
-- set bonus_punkte = 500
-- where id = 'be23e8c2-1c30-4d25-b499-4d79999141ab';
