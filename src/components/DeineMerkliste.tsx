"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { getAllArticles } from "@/lib/articles";
import { SectionDivider } from "./SectionDivider";

interface Eintrag {
  tag: string;
  neueMeldung: boolean;
}

// Persönliche Merkliste verfolgter Themen/Spiele (schema-v6.sql). Nur für
// eingeloggte Nutzer:innen sichtbar - kein leerer Platzhalter für Gäste.
export function DeineMerkliste() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [neuesThema, setNeuesThema] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [vorschlaegeOffen, setVorschlaegeOffen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const alleTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of getAllArticles()) for (const t of a.tags) set.add(t);
    return [...set].sort();
  }, []);

  const laden = async (userId: string) => {
    const { data } = await supabase.from("watchlist").select("tag").eq("user_id", userId);
    const zweiTageAlt = Date.now() - 48 * 3600000;
    const artikel = getAllArticles();
    const liste = (data ?? []).map((row) => ({
      tag: row.tag,
      neueMeldung: artikel.some(
        (a) => a.tags.includes(row.tag) && new Date(a.publishedAt).getTime() > zweiTageAlt
      ),
    }));
    setEintraege(liste);
    setGeladen(true);
  };

  useEffect(() => {
    if (session) laden(session.user.id);
    else {
      setEintraege([]);
      setGeladen(false);
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  async function hinzufuegen(wert?: string) {
    const tag = (wert ?? neuesThema).trim();
    if (!tag || !session) return;
    setFehler(null);
    setVorschlaegeOffen(false);
    const { error } = await supabase.from("watchlist").insert({ user_id: session.user.id, tag });
    if (error) {
      setFehler(error.code === "23505" ? "Schon auf deiner Merkliste." : "Konnte nicht hinzugefügt werden.");
      return;
    }
    setNeuesThema("");
    laden(session.user.id);
  }

  const bereitsVerfolgt = new Set(eintraege.map((e) => e.tag));
  const vorschlaege = neuesThema.trim()
    ? alleTags
        .filter(
          (t) => t.toLowerCase().includes(neuesThema.trim().toLowerCase()) && !bereitsVerfolgt.has(t)
        )
        .slice(0, 6)
    : alleTags.filter((t) => !bereitsVerfolgt.has(t)).slice(0, 6);

  async function entfernen(tag: string) {
    if (!session) return;
    await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("tag", tag);
    laden(session.user.id);
  }

  if (!session || !geladen) return null;

  return (
    <section aria-labelledby="merkliste-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="merkliste-heading" className="text-[20px] font-semibold tracking-tight text-text-primary">
          Deine Merkliste
        </h2>
      </div>
      <SectionDivider />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {eintraege.map((e) => (
          <div
            key={e.tag}
            // Senkrecht exakt mittig (Tim, 21.08.2026): Das Nachbarfeld
            // (Eingabe) macht die Zeile hoeher - der Text klebte oben.
            className="group relative flex flex-col justify-center rounded-2xl border border-border-subtle bg-surface-card p-4"
          >
            <button
              onClick={() => entfernen(e.tag)}
              aria-label={`${e.tag} von der Merkliste entfernen`}
              className="absolute right-2 top-2 z-10 text-text-disabled opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
            >
              ✕
            </button>
            <Link href={`/suche?q=${encodeURIComponent(e.tag)}`} className="block">
              <p className="pr-4 text-sm font-medium text-text-primary">{e.tag}</p>
              <p className={`mt-1 text-xs ${e.neueMeldung ? "text-accent" : "text-text-tertiary"}`}>
                {e.neueMeldung ? "● Neue Meldung" : "Keine neuen Meldungen"}
              </p>
            </Link>
          </div>
        ))}

        <div className="relative col-span-2 rounded-2xl border border-dashed border-border-default p-4 sm:col-span-1">
          <input
            value={neuesThema}
            onChange={(e) => setNeuesThema(e.target.value)}
            onFocus={() => setVorschlaegeOffen(true)}
            onBlur={() => setTimeout(() => setVorschlaegeOffen(false), 150)}
            onKeyDown={(e) => e.key === "Enter" && hinzufuegen()}
            placeholder="Spiel/Thema hinzufügen"
            className="w-full min-w-0 bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <button
            onClick={() => hinzufuegen()}
            className="mt-2 text-xs font-semibold text-accent hover:opacity-80"
          >
            + Hinzufügen
          </button>
          {fehler && <p className="mt-1 text-xs text-error">{fehler}</p>}

          {vorschlaegeOffen && vorschlaege.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1.5 overflow-hidden rounded-2xl border border-border-default bg-bg-elevated shadow-elevated">
              {!neuesThema.trim() && (
                <p className="px-3 pt-2.5 text-[10px] tracking-wide text-text-tertiary">VORSCHLÄGE</p>
              )}
              {vorschlaege.map((t) => (
                <button
                  key={t}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => hinzufuegen(t)}
                  className="block w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-hover transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
