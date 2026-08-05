"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Ein Client pro Browser-Sitzung. Die Werte sind bewusst öffentlich
// (anon/publishable Key) — Schreibrechte regeln die Row-Level-Security-
// Policies in der Datenbank (supabase/schema.sql).
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

export interface Profil {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bonus_punkte?: number;
}

export interface Kommentar {
  id: number;
  article_slug: string;
  author_id: string;
  parent_id: number | null;
  body: string;
  created_at: string;
  deleted: boolean;
  profiles: Profil | null;
}
