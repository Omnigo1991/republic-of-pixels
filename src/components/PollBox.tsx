"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Poll } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";

// Community-Umfrage zur Story (fester Artikel-Bauplan-Bestandteil,
// Tim-Vorgabe 08.08.2026: Beteiligung im Lesefluss statt blossem Scrollen).
// Bewusst OHNE Login-Pflicht - eine Stimme pro Besucher-Kennung (dieselbe
// anonyme localStorage-ID wie der Besuchszähler; Server erzwingt die
// Einmaligkeit zusätzlich per Unique-Constraint). Ergebnisse kommen aus der
// aggregierten View poll_ergebnisse (schema-v7.sql), nie aus Rohdaten.
export function PollBox({ articleSlug, poll }: { articleSlug: string; poll: Poll }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [stimmen, setStimmen] = useState<number[]>(() => poll.options.map(() => 0));
  const [eigene, setEigene] = useState<number | null>(null);
  const [verfuegbar, setVerfuegbar] = useState(true);

  const laden = useCallback(async () => {
    const { data, error } = await supabase
      .from("poll_ergebnisse")
      .select("option_index, stimmen")
      .eq("article_slug", articleSlug);
    if (error) {
      // Tabelle/View noch nicht angelegt (schema-v7.sql) → Box ausblenden.
      setVerfuegbar(false);
      return;
    }
    const z = poll.options.map(() => 0);
    for (const r of data ?? []) {
      if (r.option_index >= 0 && r.option_index < z.length) z[r.option_index] = r.stimmen;
    }
    setStimmen(z);
  }, [supabase, articleSlug, poll.options]);

  useEffect(() => {
    try {
      const eigen = localStorage.getItem(`rop_poll_${articleSlug}`);
      if (eigen !== null) setEigene(Number(eigen));
    } catch {
      // ohne localStorage keine Eigene-Stimme-Markierung - unkritisch
    }
    laden();
  }, [articleSlug, laden]);

  async function abstimmen(index: number) {
    if (eigene !== null) return;
    try {
      let visitor = localStorage.getItem("rop_vid");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("rop_vid", visitor);
      }
      setEigene(index);
      localStorage.setItem(`rop_poll_${articleSlug}`, String(index));
      // Optimistische Anzeige; der Server zählt dank Unique-Constraint
      // jede Kennung nur einmal.
      setStimmen((s) => s.map((n, i) => (i === index ? n + 1 : n)));
      await supabase
        .from("article_poll_votes")
        .insert({ article_slug: articleSlug, option_index: index, visitor });
      laden();
    } catch {
      // Abstimmung darf nie die Seite stören
    }
  }

  if (!verfuegbar) return null;
  const total = stimmen.reduce((a, b) => a + b, 0);
  const abgestimmt = eigene !== null;

  return (
    <div className="my-8 rounded-2xl bg-navy p-6">
      <p className="text-[13px] font-semibold tracking-wide text-accent">COMMUNITY-UMFRAGE</p>
      <p className="mt-2 font-semibold text-white">{poll.question}</p>
      <div className="mt-4 flex flex-col gap-2">
        {poll.options.map((option, i) => {
          const anteil = total > 0 ? Math.round((stimmen[i] / total) * 100) : 0;
          return abgestimmt ? (
            <div
              key={i}
              className={`relative overflow-hidden rounded-2xl border px-4 py-2.5 ${i === eigene ? "border-accent/70" : "border-white/15"}`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-accent/15 transition-all duration-700"
                style={{ width: `${anteil}%` }}
              />
              <div className="relative flex items-center justify-between gap-3 text-sm">
                <span className={i === eigene ? "font-semibold text-white" : "text-[#C7CAD8]"}>
                  {option}
                  {i === eigene && <span className="ml-2 text-accent">✓</span>}
                </span>
                <span className="shrink-0 font-semibold text-accent">{anteil}%</span>
              </div>
            </div>
          ) : (
            <button
              key={i}
              onClick={() => abstimmen(i)}
              className="rounded-2xl border border-white/15 px-4 py-2.5 text-left text-sm text-[#E9EAF0] transition-colors hover:border-accent/60 hover:bg-white/[0.06]"
            >
              {option}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-[#8A8FA3]">
        {abgestimmt
          ? `${total.toLocaleString("de-DE")} ${total === 1 ? "Stimme" : "Stimmen"} - danke fürs Mitmachen!`
          : "Anonym abstimmen und sehen, was die Community denkt."}
      </p>
    </div>
  );
}
