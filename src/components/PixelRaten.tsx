"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SectionDivider } from "./SectionDivider";
import { getSupabase } from "@/lib/supabase";
import raetsel from "@/content/pixelraten.json";

// Pixel-Raten — das tägliche Rätsel der Republic (Tim-Freigabe 09.08.2026):
// Ein verpixeltes Spiel-Artwork, fünf Versuche, mit jedem Fehlversuch wird
// das Bild eine Stufe schärfer. Rätsel-Daten kommen statisch aus
// src/content/pixelraten.json (nächtlich von pipeline/pixelraten.mjs
// erzeugt). Fortschritt und Serie leben anonym im Browser (localStorage,
// kein Login); die Community-Statistik läuft wie die Artikel-Umfragen über
// Supabase (schema-v8.sql) und blendet sich aus, solange die Tabelle fehlt.
// Design bewusst aus den Haus-Rezepten: CategoryPill-Pille, Standard-
// Eingabefeld, Accent-Knopf, Karten- und Sektions-Bauart der Radare.

interface Fortschritt {
  datum: string;
  tipps: string[];
  geloest: boolean;
}

const MAX_VERSUCHE = 5;

// Untergrenze für die Community-Zeile (Tim, 09.08.2026): Bei einem einzigen
// Teilnehmer stünde dort "von 100 % der Republic gelöst" — das liest sich
// leer statt souverän und untergräbt genau den Vergleich, wegen dem die
// Zeile existiert. Unter fünf Teilnehmern bleibt sie darum unsichtbar.
const MIN_TEILNEHMER = 5;

// Serien-Symbol — gleiche Bauart wie die Profil-Icons (24er-Raster,
// gefüllte Silhouette, currentColor). Ersetzt das 🔥-Emoji (Tim,
// 09.08.2026). Bewusst ein BLITZ statt einer Flamme: Drei Flammen-
// Entwürfe lasen sich bei 14 px allesamt als Wassertropfen, der Blitz
// ist auf jeder Grösse eindeutig und passt zur kantigen Pixel-Sprache.
function IconBlitz({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13.5 1.5 5 13.2h5.2L9.4 22.5 19 10.3h-5.4z" />
    </svg>
  );
}

const normalisiert = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

function ladeFortschritt(): Fortschritt {
  const leer = { datum: raetsel.datum, tipps: [], geloest: false };
  try {
    const roh = localStorage.getItem("rop_pixelraten");
    if (!roh) return leer;
    const alt = JSON.parse(roh) as Fortschritt;
    return alt.datum === raetsel.datum ? alt : leer;
  } catch {
    return leer;
  }
}

export function PixelRaten() {
  const supabase = useMemo(() => getSupabase(), []);
  const [bereit, setBereit] = useState(false);
  const [tipps, setTipps] = useState<string[]>([]);
  const [geloest, setGeloest] = useState(false);
  const [eingabe, setEingabe] = useState("");
  const [serie, setSerie] = useState(0);
  const [geteilt, setGeteilt] = useState(false);
  const [statistik, setStatistik] = useState<{ prozent: number; schnitt: number } | null>(null);
  const gemeldet = useRef(false);

  const fertig = geloest || tipps.length >= MAX_VERSUCHE;
  const stufe = fertig ? MAX_VERSUCHE : Math.min(tipps.length + 1, MAX_VERSUCHE);

  useEffect(() => {
    const f = ladeFortschritt();
    setTipps(f.tipps);
    setGeloest(f.geloest);
    try {
      const s = JSON.parse(localStorage.getItem("rop_pixelraten_serie") ?? "null");
      if (s?.count) setSerie(s.count);
    } catch {
      // ohne Serie weiterspielen
    }
    setBereit(true);
  }, []);

  useEffect(() => {
    // Community-Statistik des Tages (View aus schema-v8.sql); fehlt sie,
    // bleibt die Zeile einfach weg.
    supabase
      .from("pixelraten_statistik")
      .select("teilnehmer, geloest_prozent, schnitt_versuche")
      .eq("datum", raetsel.datum)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && (data.teilnehmer ?? 0) >= MIN_TEILNEHMER) {
          setStatistik({ prozent: data.geloest_prozent ?? 0, schnitt: data.schnitt_versuche ?? 0 });
        }
      });
  }, [supabase]);

  function speichern(neueTipps: string[], neuGeloest: boolean) {
    try {
      localStorage.setItem(
        "rop_pixelraten",
        JSON.stringify({ datum: raetsel.datum, tipps: neueTipps, geloest: neuGeloest })
      );
    } catch {
      // Fortschritt nur im Speicher — unkritisch
    }
  }

  function serieFortschreiben(gewonnen: boolean) {
    try {
      const roh = JSON.parse(localStorage.getItem("rop_pixelraten_serie") ?? "null");
      const gestern = new Date(new Date(raetsel.datum + "T12:00:00Z").getTime() - 86400000)
        .toISOString()
        .slice(0, 10);
      const neu = gewonnen ? (roh?.letzterTag === gestern ? (roh.count ?? 0) + 1 : 1) : 0;
      localStorage.setItem(
        "rop_pixelraten_serie",
        JSON.stringify({ count: neu, letzterTag: raetsel.datum })
      );
      setSerie(neu);
    } catch {
      // Serie ist Bonus, kein Muss
    }
  }

  async function melden(versuche: number, gewonnen: boolean) {
    if (gemeldet.current) return;
    gemeldet.current = true;
    try {
      let visitor = localStorage.getItem("rop_vid");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("rop_vid", visitor);
      }
      await supabase
        .from("pixelraten_ergebnisse")
        .insert({ datum: raetsel.datum, visitor, versuche, geloest: gewonnen });
    } catch {
      // Statistik darf nie das Spiel stören
    }
  }

  function raten() {
    const tipp = eingabe.trim();
    if (!tipp || fertig) return;
    setEingabe("");
    const treffer = raetsel.akzeptiert.includes(normalisiert(tipp));
    const neueTipps = [...tipps, tipp];
    setTipps(neueTipps);
    setGeloest(treffer);
    speichern(neueTipps, treffer);
    if (treffer) {
      serieFortschreiben(true);
      melden(neueTipps.length, true);
    } else if (neueTipps.length >= MAX_VERSUCHE) {
      serieFortschreiben(false);
      melden(neueTipps.length, false);
    }
  }

  async function teilen() {
    const quadrate = tipps
      .map((_, i) => (geloest && i === tipps.length - 1 ? "🟩" : "🟥"))
      .join("");
    const text = `Pixel-Raten: ${quadrate} — ${
      geloest ? `gelöst in ${tipps.length} ${tipps.length === 1 ? "Versuch" : "Versuchen"}` : "heute nicht geknackt"
    }\nDas tägliche Gaming-Rätsel auf republicofpixels.com`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setGeteilt(true);
        setTimeout(() => setGeteilt(false), 2500);
      }
    } catch {
      // Abbruch des Teilen-Dialogs ist kein Fehler
    }
  }

  const falscheTipps = geloest ? tipps.slice(0, -1) : tipps;

  return (
    <section aria-labelledby="pixelraten-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="pixelraten-heading" className="text-[24px] font-black tracking-tight text-text-primary sm:text-[28px]">
          Pixel-Raten
        </h2>
        <span className="text-xs text-text-tertiary">
          Das tägliche Rätsel · jede Nacht neu
        </span>
      </div>
      <SectionDivider />
      <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-surface-card p-5 sm:flex-row sm:p-6">
        <div className="relative w-full shrink-0 overflow-hidden rounded-2xl border border-border-subtle sm:w-[320px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={raetsel.bilder[stufe - 1]}
            alt={`Verpixeltes Spiel-Artwork, Schärfe-Stufe ${stufe} von ${MAX_VERSUCHE}`}
            className="aspect-[4/5] w-full object-cover [image-rendering:pixelated]"
          />
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-accent/40 bg-bg-elevated/85 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-accent backdrop-blur">
            SCHÄRFE-STUFE {stufe} / {MAX_VERSUCHE}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-lg font-semibold tracking-tight text-text-primary">
            Welches Spiel versteckt sich hinter den Pixeln?
          </p>
          <p className="mt-1 text-sm leading-relaxed text-text-tertiary">
            Mit jedem Fehlversuch wird das Bild eine Stufe schärfer. Errätst du es, bevor es ganz
            aufgelöst ist?
          </p>

          <div className="mt-4 flex gap-2">
            {Array.from({ length: MAX_VERSUCHE }, (_, i) => {
              const falsch = i < falscheTipps.length;
              const erfolg = geloest && i === tipps.length - 1;
              const aktiv = !fertig && i === tipps.length;
              return (
                <span
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl border text-sm font-bold ${
                    erfolg
                      ? "border-accent bg-accent/15 text-accent"
                      : falsch
                        ? "border-error/45 bg-error/10 text-error"
                        : aktiv
                          ? "border-accent text-accent"
                          : "border-border-subtle text-text-tertiary"
                  }`}
                >
                  {erfolg ? "✓" : falsch ? "✕" : i + 1}
                </span>
              );
            })}
          </div>

          {falscheTipps.length > 0 && (
            <p className="mt-3 text-xs text-text-tertiary">
              Deine Tipps:{" "}
              {falscheTipps.map((t, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  <span className="text-error/80 line-through">{t}</span>
                </span>
              ))}
            </p>
          )}

          {/* HINWEIS SCHON NACH DEM ERSTEN FEHLVERSUCH (Tim, 12.08.2026):
              Vorher erst nach zwei. Wer zweimal ohne jede Stütze danebenlag,
              hatte das Rätsel meist schon aufgegeben — der Hinweis kam zu
              spät, um noch zu helfen. Der zweite Hinweis folgt weiterhin
              später, damit es nicht zu leicht wird. */}
          {!fertig && falscheTipps.length >= 1 && (
            <div className="mt-3 rounded-2xl border border-accent/25 bg-accent/5 px-4 py-2.5 text-sm text-text-secondary">
              <span className="font-semibold text-accent">Hinweis:</span> {raetsel.hinweise[0]}
              {falscheTipps.length >= 3 && <> · {raetsel.hinweise[1]}</>}
            </div>
          )}

          {bereit && fertig ? (
            <div className="mt-4 rounded-2xl border border-border-subtle bg-bg-elevated px-4 py-3">
              {geloest ? (
                <p className="text-sm text-text-primary">
                  <span className="font-semibold text-accent">Richtig!</span> Es war{" "}
                  <span className="font-semibold">{raetsel.loesung}</span> — gelöst in {tipps.length}{" "}
                  {tipps.length === 1 ? "Versuch" : "Versuchen"}.
                </p>
              ) : (
                <p className="text-sm text-text-primary">
                  Heute nicht geknackt — es war{" "}
                  <span className="font-semibold text-accent">{raetsel.loesung}</span>. Morgen wartet
                  ein neues Rätsel!
                </p>
              )}
              <button
                onClick={teilen}
                className="mt-3 rounded-full border border-accent/50 px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                {geteilt ? "Kopiert!" : "Ergebnis teilen"}
              </button>
            </div>
          ) : (
            <div className="mt-4 flex gap-2">
              <input
                value={eingabe}
                onChange={(e) => setEingabe(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && raten()}
                placeholder="Spielname eingeben …"
                disabled={!bereit}
                className="min-w-0 flex-1 rounded-full border border-border-default bg-bg-elevated px-4 py-2.5 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
              />
              <button
                onClick={raten}
                disabled={!bereit || !eingabe.trim()}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#0F0D2C] hover:opacity-90 disabled:opacity-40"
              >
                Raten
              </button>
            </div>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            {serie > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-accent">
                <IconBlitz className="h-3.5 w-3.5" />
                <span className="flex h-3.5 items-center">
                  {serie === 1 ? "1 Tag" : `${serie} Tage`} in Folge gelöst
                </span>
              </span>
            ) : (
              <span className="text-xs text-text-tertiary">Löse das Rätsel und starte deine Serie</span>
            )}
            {statistik && (
              <span className="text-xs text-text-tertiary">
                Heute von {statistik.prozent} % der Republic gelöst · Ø{" "}
                {statistik.schnitt.toLocaleString("de-CH", { maximumFractionDigits: 1 })} Versuche
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
