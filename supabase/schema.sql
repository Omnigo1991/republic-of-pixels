-- Republic of Pixels — Kommentarsystem (Schema + Sicherheitsregeln)
-- Einmalig im Supabase SQL-Editor ausführen (Dashboard → SQL Editor → Run).

-- ===== Profile (Nickname pro Konto) =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text unique not null
    check (char_length(nickname) between 3 and 24 and nickname ~ '^[A-Za-z0-9_.\-]+$'),
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profile sind öffentlich lesbar"
  on public.profiles for select using (true);
create policy "Eigenes Profil anlegen"
  on public.profiles for insert with check (auth.uid() = id);
create policy "Eigenes Profil ändern"
  on public.profiles for update using (auth.uid() = id);

-- ===== Kommentare (eine Antwort-Ebene) =====
create table public.comments (
  id bigint generated always as identity primary key,
  article_slug text not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id bigint references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  deleted boolean not null default false
);

create index comments_article_idx on public.comments (article_slug, created_at);
create index comments_parent_idx on public.comments (parent_id);

alter table public.comments enable row level security;

create policy "Kommentare sind öffentlich lesbar"
  on public.comments for select using (true);
create policy "Angemeldete schreiben als sie selbst"
  on public.comments for insert with check (auth.uid() = author_id);
create policy "Eigene Kommentare ändern (Soft-Delete)"
  on public.comments for update using (auth.uid() = author_id);

-- Nur eine Antwort-Ebene: Antworten auf Antworten sind nicht erlaubt.
create or replace function public.enforce_single_reply_level()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.parent_id is not null then
    if exists (select 1 from public.comments where id = new.parent_id and parent_id is not null) then
      raise exception 'Antworten auf Antworten sind nicht erlaubt';
    end if;
  end if;
  return new;
end $$;

create trigger comments_single_level
  before insert on public.comments
  for each row execute function public.enforce_single_reply_level();

-- ===== Upvotes =====
create table public.comment_votes (
  comment_id bigint not null references public.comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.comment_votes enable row level security;

create policy "Votes sind öffentlich lesbar"
  on public.comment_votes for select using (true);
create policy "Eigene Votes setzen"
  on public.comment_votes for insert with check (auth.uid() = user_id);
create policy "Eigene Votes entfernen"
  on public.comment_votes for delete using (auth.uid() = user_id);

-- ===== Meldungen (nur schreiben; lesen nur im Dashboard) =====
create table public.comment_reports (
  id bigint generated always as identity primary key,
  comment_id bigint not null references public.comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text check (char_length(reason) <= 500),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

alter table public.comment_reports enable row level security;

create policy "Angemeldete können melden"
  on public.comment_reports for insert with check (auth.uid() = reporter_id);
