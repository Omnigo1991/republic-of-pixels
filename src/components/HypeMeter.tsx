"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { AnmeldeDialog } from "./AuthDialog";

// Hype-Meter (Tim, 21.08.2026): Ein-Klick-Stimmung pro Artikel -
// Beteiligung ohne Kommentarzwang. Gleiche Bauart wie die Reaktionen:
// angemeldet stimmen, eine Stimme pro Konto, Tabelle hype_votes
// (supabase/schema-v10.sql). Fehlt die Tabelle noch, blendet sich das
// Modul aus, statt Fehler zu zeigen.
export function HypeMeter({ articleSlug }: { articleSlug: string }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [hype, setHype] = useState(0);
  const [kalt, setKalt] = useState(0);
  const [eigene, setEigene] = useState<string | null>(null);
  const [verfuegbar, setVerfuegbar] = useState(true);
  const [loginOffen, setLoginOffen] = useState(false);

  const laden = useCallback(
    async (uid: string | null) => {
      const { data, error } = await supabase
        .from("hype_votes")
        .select("wert, user_id")
        .eq("article_slug", articleSlug);
      if (error) {
        setVerfuegbar(false);
        return;
      }
      let h = 0, k = 0, eigen: string | null = null;
      for (const z of (data ?? []) as { wert: string; user_id: string }[]) {
        if (z.wert === "hype") h++;
        else k++;
        if (uid && z.user_id === uid) eigen = z.wert;
      }
      setHype(h);
      setKalt(k);
      setEigene(eigen);
    },
    [supabase, articleSlug]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      laden(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      laden(s?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, laden]);

  async function stimmen(wert: "hype" | "kalt") {
    if (!session) return setLoginOffen(true);
    const uid = session.user.id;
    if (eigene === wert) {
      await supabase.from("hype_votes").delete().match({ article_slug: articleSlug, user_id: uid });
    } else {
      await supabase
        .from("hype_votes")
        .upsert({ article_slug: articleSlug, user_id: uid, wert }, { onConflict: "article_slug,user_id" });
    }
    laden(uid);
  }

  if (!verfuegbar) return null;
  const gesamt = hype + kalt;
  const anteil = gesamt === 0 ? 50 : Math.round((hype / gesamt) * 100);

  return (
    <div className="my-8 rounded-2xl border border-border-subtle bg-surface-card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[12px] font-extrabold tracking-[0.08em] text-accent">HYPE-METER</span>
        <span className="text-xs text-text-tertiary">
          {gesamt === 0 ? "Noch keine Stimmen - gib die erste ab" : `${gesamt} ${gesamt === 1 ? "Stimme" : "Stimmen"}`}
        </span>
      </div>
      <div className="mb-4 h-3 overflow-hidden rounded-full bg-border-subtle">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-magenta transition-[width] duration-500"
          style={{ width: `${anteil}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => stimmen("hype")}
          className={`rounded-full border px-4 py-1.5 text-sm font-bold transition-colors ${
            eigene === "hype"
              ? "border-transparent bg-[#02F0D1] text-[#0B0616]"
              : "border-accent/45 text-accent hover:border-accent/70"
          }`}
        >
          Hype!{gesamt > 0 ? ` · ${anteil}%` : ""}
        </button>
        <button
          onClick={() => stimmen("kalt")}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
            eigene === "kalt"
              ? "border-transparent bg-[#02F0D1] text-[#0B0616]"
              : "border-accent/45 text-text-secondary hover:border-accent/70"
          }`}
        >
          Lässt mich kalt{gesamt > 0 ? ` · ${100 - anteil}%` : ""}
        </button>
      </div>
      {loginOffen && <AnmeldeDialog onSchliessen={() => setLoginOffen(false)} />}
    </div>
  );
}
