"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { AnmeldeDialog } from "./AuthDialog";

// Artikel-Reaktionen für angemeldete Leser: eine Reaktion pro Person und
// Artikel, umschaltbar. Datenhaltung: Tabelle article_reactions
// (supabase/schema-v2.sql — muss einmalig im SQL-Editor ausgeführt werden).
const REAKTIONEN: { key: string; emoji: string; label: string }[] = [
  { key: "gefaellt", emoji: "👍", label: "Gefällt mir" },
  { key: "liebe", emoji: "❤️", label: "Liebe ich" },
  { key: "gefaellt_nicht", emoji: "👎", label: "Gefällt mir nicht" },
  { key: "enttaeuschend", emoji: "😞", label: "Enttäuschend" },
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
              <span aria-hidden="true">{r.emoji}</span>
              {anzahl > 0 && <span className="text-xs font-semibold text-accent">{anzahl}</span>}
            </button>
          );
        })}
      </div>
      {loginOffen && <AnmeldeDialog onSchliessen={() => setLoginOffen(false)} />}
    </>
  );
}
