"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { AnmeldeDialog } from "./AuthDialog";

function ThumbsUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M2 20h3V9H2v11zm19-9c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L12.17 2 6.59 7.59C6.22 7.95 6 8.45 6 9v9c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
    </svg>
  );
}

function ThumbsDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 4h-3v11h3V4zM3 13c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L11.83 22l5.58-5.59c.37-.36.59-.86.59-1.41V6c0-1.1-.9-2-2-2h-9c-.83 0-1.54.5-1.84 1.22L1.14 11.27c-.09.23-.14.47-.14.73v2z" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function DisappointedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10h.01M15.5 10h.01" strokeWidth="2.4" />
      <path d="M8.5 16c1-1.5 6-1.5 7 0" />
    </svg>
  );
}

// Artikel-Reaktionen für angemeldete Leser: eine Reaktion pro Person und
// Artikel, umschaltbar. Datenhaltung: Tabelle article_reactions
// (supabase/schema-v2.sql — muss einmalig im SQL-Editor ausgeführt werden).
const REAKTIONEN: {
  key: string;
  Icon: (props: { className?: string }) => JSX.Element;
  label: string;
}[] = [
  { key: "gefaellt", Icon: ThumbsUpIcon, label: "Gefällt mir" },
  { key: "liebe", Icon: HeartIcon, label: "Liebe ich" },
  { key: "gefaellt_nicht", Icon: ThumbsDownIcon, label: "Gefällt mir nicht" },
  { key: "enttaeuschend", Icon: DisappointedIcon, label: "Enttäuschend" },
];

export function ArticleReactions({ articleSlug }: { articleSlug: string }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [zaehler, setZaehler] = useState<Map<string, number>>(new Map());
  const [eigene, setEigene] = useState<string | null>(null);
  const [verfuegbar, setVerfuegbar] = useState(true);
  const [loginOffen, setLoginOffen] = useState(false);

  const laden = useCallback(
    async (uid: string | null) => {
      const { data, error } = await supabase
        .from("article_reactions")
        .select("reaction, user_id")
        .eq("article_slug", articleSlug);
      if (error) {
        // Tabelle existiert noch nicht (schema-v2.sql nicht ausgeführt) —
        // Reaktionen werden ausgeblendet statt Fehler zu zeigen.
        setVerfuegbar(false);
        return;
      }
      const z = new Map<string, number>();
      let eigen: string | null = null;
      for (const r of data ?? []) {
        z.set(r.reaction, (z.get(r.reaction) ?? 0) + 1);
        if (uid && r.user_id === uid) eigen = r.reaction;
      }
      setZaehler(z);
      setEigene(eigen);
    },
    [supabase, articleSlug]
  );

  useEffect(() => {
    let uid: string | null = null;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      uid = data.session?.user.id ?? null;
      laden(uid);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      laden(s?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, laden]);

  async function reagieren(key: string) {
    if (!session) return setLoginOffen(true);
    const uid = session.user.id;
    if (eigene === key) {
      await supabase
        .from("article_reactions")
        .delete()
        .match({ article_slug: articleSlug, user_id: uid });
    } else {
      await supabase
        .from("article_reactions")
        .upsert(
          { article_slug: articleSlug, user_id: uid, reaction: key },
          { onConflict: "article_slug,user_id" }
        );
    }
    laden(uid);
  }

  if (!verfuegbar) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {REAKTIONEN.map((r) => {
          const anzahl = zaehler.get(r.key) ?? 0;
          const aktiv = eigene === r.key;
          return (
            <button
              key={r.key}
              onClick={() => reagieren(r.key)}
              title={r.label}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                aktiv
                  ? "border-accent bg-accent/15 text-text-primary"
                  : "border-border-default text-text-secondary hover:border-accent/50 hover:text-text-primary"
              }`}
            >
              <span>{r.label}</span>
              <r.Icon className="h-4 w-4" />
              {anzahl > 0 && <span className="text-xs font-semibold text-accent">{anzahl}</span>}
            </button>
          );
        })}
      </div>
      {loginOffen && <AnmeldeDialog onSchliessen={() => setLoginOffen(false)} />}
    </>
  );
}
