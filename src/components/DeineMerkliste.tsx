"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { getAllArticles } from "@/lib/articles";
import { PixelDivider } from "./PixelDivider";

interface Eintrag {
  tag: string;
  neueMeldung: boolean;
}

// Persönliche Merkliste verfolgter Themen/Spiele (schema-v6.sql). Nur für
// eingeloggte Nutzer:innen sichtbar — kein leerer Platzhalter für Gäste.
export function DeineMerkliste() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [geladen, setGeladen] = useState(false);
  const [neuesThema, setNeuesThema] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

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

  async function hinzufuegen() {
    const tag = neuesThema.trim();
    if (!tag || !session) return;
    setFehler(null);
    const { error } = await supabase.from("watchlist").insert({ user_id: session.user.id, tag });
    if (error) {
      setFehler(error.code === "23505" ? "Schon auf deiner Merkliste." : "Konnte nicht hinzugefügt werden.");
      return;
    }
    setNeuesThema("");
    laden(session.user.id);
  }

  async function entfernen(tag: string) {
    if (!session) return;
    await supabase.from("watchlist").delete().eq("user_id", session.user.id).eq("tag", tag);
    laden(session.user.id);
  }

  if (!session || !geladen) return null;

  return (
    <section aria-labelledby="merkliste-heading" className="py-10">
      <h2 id="merkliste-heading" className="mb-3 text-xl font-semibold tracking-tight text-text-primary">
        Deine Merkliste
      </h2>
      <PixelDivider />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {eintraege.map((e) => (
          <div
            key={e.tag}
            className="group relative rounded-2xl border border-border-subtle bg-surface-card p-4"
          >
            <button
              onClick={() => entfernen(e.tag)}
              aria-label={`${e.tag} von der Merkliste entfernen`}
              className="absolute right-2 top-2 text-text-disabled opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
            >
              ✕
            </button>
            <p className="pr-4 text-sm font-medium text-text-primary">{e.tag}</p>
            <p className={`mt-1 text-xs ${e.neueMeldung ? "text-accent" : "text-text-tertiary"}`}>
              {e.neueMeldung ? "● Neue Meldung" : "Keine neuen Meldungen"}
            </p>
          </div>
        ))}

        <div className="rounded-2xl border border-dashed border-border-default p-4">
          <input
            list="merkliste-tags"
            value={neuesThema}
            onChange={(e) => setNeuesThema(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && hinzufuegen()}
            placeholder="Spiel/Thema hinzufügen"
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
          <datalist id="merkliste-tags">
            {alleTags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <button
            onClick={hinzufuegen}
            className="mt-2 text-xs font-semibold text-accent hover:opacity-80"
          >
            + Hinzufügen
          </button>
          {fehler && <p className="mt-1 text-xs text-error">{fehler}</p>}
        </div>
      </div>
    </section>
  );
}
