"use client";

import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import radar from "@/content/themenradar.json";

// STORY-RADAR (Tim, 11.08.2026) — internes Redaktionswerkzeug, nur im
// Cockpit sichtbar.
//
// Zeigt die Lücke zwischen dem, was in unseren 42 Quellen passiert, und dem,
// was bei uns steht. Die Daten entstehen bei jedem Pipeline-Lauf in
// pipeline/lib/themenradar.mjs — vorher wurden sie ersatzlos verworfen.
//
// HINWEIS ZUR VERTRAULICHKEIT: Die Daten liegen in einer JSON-Datei, die in
// das Seitenbündel dieser Route wandert. Sie sind damit nicht geheim, sondern
// nur nicht verlinkt — wer den Route-Chunk gezielt abruft, könnte sie lesen.
// Das ist vertretbar, weil dort nur fremde Schlagzeilen und Quellennamen
// stehen. Sollen sie wirklich verschlossen sein, müssten sie über eine
// geschützte API-Route kommen.

interface Thema {
  titel: string;
  quellen: number;
  meldungen: number;
  stundenSeitErster: number;
  tempo: number;
  quellenNamen: string[];
  beispiele: { titel: string; link: string | null }[];
  abgedeckt: boolean;
}

export function StoryRadar() {
  const supabase = useMemo(() => getSupabase(), []);
  const themen = (radar.themen ?? []) as Thema[];
  const [gesendet, setGesendet] = useState<Record<string, "laeuft" | "ok" | "fehler">>({});

  const stand = new Date(radar.stand);
  const alter = Math.round((Date.now() - stand.getTime()) / 60000);

  async function nachziehen(t: Thema) {
    setGesendet((g) => ({ ...g, [t.titel]: "laeuft" }));
    const { error } = await supabase.from("themen_auftraege").insert({
      titel: t.titel,
      quellen: t.quellen,
      hinweise: t.beispiele.map((b) => b.titel).join(" | ").slice(0, 1000),
    });
    setGesendet((g) => ({ ...g, [t.titel]: error ? "fehler" : "ok" }));
  }

  if (themen.length === 0) {
    return (
      <p className="rounded-2xl border border-border-subtle bg-surface-card p-5 text-sm text-text-tertiary">
        Noch keine Themen erfasst — der Radar füllt sich beim nächsten Pipeline-Lauf.
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      {themen.map((t) => {
        const zustand = gesendet[t.titel];
        return (
          <div
            key={t.titel}
            className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-card p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{t.titel}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {t.quellen} Quellen in {t.stundenSeitErster} Std. · {t.quellenNamen.join(", ")}
              </p>
            </div>

            {/* Tempo als Balken: Quellen pro Stunde, gedeckelt bei 5 */}
            <div className="flex shrink-0 items-center gap-3">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border-subtle">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, (t.tempo / 5) * 100)}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-bold text-accent">+{t.tempo}</span>
            </div>

            <div className="shrink-0">
              {t.abgedeckt ? (
                <span className="inline-flex items-center rounded-full border border-border-default bg-surface-hover px-3 py-1 text-[10px] font-bold tracking-wider text-text-tertiary">
                  VERÖFFENTLICHT
                </span>
              ) : zustand === "ok" ? (
                <span className="inline-flex items-center rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[10px] font-bold tracking-wider text-accent">
                  IN DER WARTESCHLANGE
                </span>
              ) : (
                <button
                  onClick={() => nachziehen(t)}
                  disabled={zustand === "laeuft"}
                  className="inline-flex items-center rounded-full border border-error/50 bg-error/10 px-3 py-1 text-[10px] font-bold tracking-wider text-error transition-opacity hover:opacity-80 disabled:opacity-40"
                >
                  {zustand === "laeuft"
                    ? "…"
                    : zustand === "fehler"
                      ? "TABELLE FEHLT"
                      : "NACHZIEHEN"}
                </button>
              )}
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-text-tertiary">
        Stand vor {alter} Minuten · aktualisiert sich mit jedem Pipeline-Lauf
      </p>
    </div>
  );
}
