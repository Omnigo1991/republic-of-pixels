"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// Kommentarzahl in Listenzeilen (Tim, 21.08.2026, Vorbild play3):
// sozialer Beweis direkt in der Liste. EIN Abruf pro Seitenaufruf fuer
// ALLE Zeilen - der Zwischenspeicher auf Modulebene verhindert, dass
// jede Zeile ihre eigene Datenbankabfrage stellt. Bei heutigen
// Kommentarmengen (dreistellig) ist der Voll-Abruf guenstiger als jede
// Zaehl-Logik; waechst das stark, gehoert hier eine gruppierte Abfrage
// hin. Zeigt sich erst ab einem Kommentar - Nullen sind nur Laerm.
let zaehlerVersprechen: Promise<Map<string, number>> | null = null;

function ladeZaehler(): Promise<Map<string, number>> {
  if (!zaehlerVersprechen) {
    zaehlerVersprechen = (async () => {
      const karte = new Map<string, number>();
      try {
        const { data, error } = await getSupabase().from("comments").select("article_slug");
        if (error) return karte;
        for (const zeile of (data ?? []) as { article_slug: string }[]) {
          karte.set(zeile.article_slug, (karte.get(zeile.article_slug) ?? 0) + 1);
        }
      } catch {
        // Ohne Datenbank keine Zahlen - die Liste bleibt einfach ohne.
      }
      return karte;
    })();
  }
  return zaehlerVersprechen;
}

export function KommentarZahl({ slug }: { slug: string }) {
  const [anzahl, setAnzahl] = useState(0);

  useEffect(() => {
    let aktiv = true;
    ladeZaehler().then((karte) => {
      if (aktiv) setAnzahl(karte.get(slug) ?? 0);
    });
    return () => {
      aktiv = false;
    };
  }, [slug]);

  if (anzahl === 0) return null;
  return (
    <span className="whitespace-nowrap">
      {" · "}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        className="inline h-3 w-3 -translate-y-px text-accent"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>{" "}
      <span className="font-bold text-accent">{anzahl}</span>
    </span>
  );
}
