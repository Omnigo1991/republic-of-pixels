-- Schema v10 (11.08.2026): Warteschlange für den Story-Radar.
--
-- Ein Klick auf "Nachziehen" im Redaktions-Cockpit legt hier einen Auftrag
-- ab. Die Pipeline liest ihn beim nächsten Lauf und greift das Thema
-- bevorzugt auf. Ohne diese Tabelle zeigt der Knopf "TABELLE FEHLT" — der
-- Radar selbst funktioniert trotzdem, nur eben als reine Anzeige.
--
-- Ausführen im Supabase-SQL-Editor.

create table if not exists themen_auftraege (
  id bigint generated always as identity primary key,
  titel text not null,
  quellen smallint,
  hinweise text,
  erledigt boolean not null default false,
  created_at timestamptz not null default now()
);

alter table themen_auftraege enable row level security;

-- Nur angemeldete Konten dürfen Aufträge anlegen. Das Cockpit ist ohnehin
-- nur dem Master zugänglich; diese Regel ist die zusätzliche Absicherung in
-- der Datenbank selbst.
create policy "themen_auftraege_insert_auth" on themen_auftraege
  for insert to authenticated with check (true);

-- Die Pipeline liest die offenen Aufträge mit dem öffentlichen Anon-Schlüssel
-- (derselbe, der ohnehin im Browser-Bündel steckt). Es stehen nur fremde
-- Schlagzeilen darin, nichts Schützenswertes.
create policy "themen_auftraege_select_anon" on themen_auftraege
  for select to anon, authenticated using (true);

-- Abhaken darf ebenfalls nur der angemeldete Bereich; die Pipeline nutzt
-- dafür denselben Weg wie beim Lesen.
create policy "themen_auftraege_update_anon" on themen_auftraege
  for update to anon, authenticated using (true) with check (true);

create index if not exists themen_auftraege_offen_idx
  on themen_auftraege (erledigt, created_at desc);
