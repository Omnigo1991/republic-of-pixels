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
