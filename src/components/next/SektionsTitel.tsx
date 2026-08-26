"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VERLAUFSTEXT } from "./Bausteine";
import events from "@/content/events.json";

// Sektionstitel im neuen Design (Tim-Freigabe 22.08.2026): Gross-
// Kleinschreibung im Markenverlauf statt des gesperrten SVG-Banners.
// Der Verlauf braucht w-fit, sonst zeigt die Schrift nur seine blasse
// Mitte (nachgemessen 22.08.2026).
export function SektionsTitel({
  titel,
  unter,
  mittig = false,
}: {
  titel: string;
  unter?: string;
  mittig?: boolean;
}) {
  return (
    <div className={`schrift-normal ${mittig ? "text-center" : ""} mb-6`}>
      <h2 className="text-[26px] font-bold leading-[1.1] sm:text-[34px] lg:text-[40px]">
        <span className={`${VERLAUFSTEXT} pb-[0.06em] mb-[-0.06em] ${mittig ? "mx-auto" : ""}`}>{titel}</span>
      </h2>
      {unter && (
        <p className={`mt-2 text-[15px] text-[#a1a1a6] sm:text-[17px] ${mittig ? "mx-auto max-w-[560px]" : ""}`}>
          {unter}
        </p>
      )}
    </div>
  );
}

// EVENT-COUNTDOWN.
//
// RÜCKT VON SELBST WEITER (Tim, 25.08.2026: "Auf unserer Seite fehlt der
// Countdown zum nächsten Event").
//
// Vorher stand hier ein FEST EINGETRAGENER Termin - Opening Night Live,
// 25. August. Als der Moment vorbei war, lieferte die Komponente null und
// der ganze Block verschwand von der Startseite. Er wäre nie von selbst
// weitergerückt; jemand hätte das Datum von Hand nachtragen müssen, und
// genau das ist nicht passiert.
//
// Jetzt kommt das Ziel aus derselben Quelle wie der Event-Radar
// (src/content/events.json). Ein Termin zählt nur mit, wenn er einen
// EXAKTEN Startzeitpunkt hat ("startIso") und ausdrücklich als Countdown
// markiert ist ("countdown": true). Beides bewusst: Eine fünftägige Messe
// hat keinen Moment, auf den man herunterzählen kann - eine Show um 21:00
// Uhr schon.
type Termin = {
  name: string;
  startIso?: string;
  countdown?: boolean;
  dateLabel?: string;
  beschreibung?: string;
};

function naechsterTermin(jetzt: number): Termin | null {
  // events.json ist ein Objekt mit einem Hinweis und der Liste - siehe
  // dieselbe Struktur im Event-Radar.
  const kandidaten = ((events as { events: Termin[] }).events ?? [])
    .filter((e) => e.countdown && e.startIso)
    .filter((e) => new Date(e.startIso as string).getTime() > jetzt)
    .sort((a, b) => new Date(a.startIso as string).getTime() - new Date(b.startIso as string).getTime());
  return kandidaten[0] ?? null;
}

export function EventCountdown({ href = "/#radare" }: { href?: string }) {
  const [rest, setRest] = useState<{ t: number; s: number; m: number } | null>(null);
  const [termin, setTermin] = useState<Termin | null>(null);

  useEffect(() => {
    // Erst im Browser rechnen: Der Server kennt die Uhrzeit des Lesers
    // nicht, und eine vorgerenderte Zahl wäre beim Aufschlagen falsch.
    // Der Termin wird bei JEDEM Takt neu gesucht - läuft einer ab,
    // während die Seite offen ist, rückt der Block auf den nächsten.
    const rechne = () => {
      const jetzt = Date.now();
      const naechster = naechsterTermin(jetzt);
      setTermin(naechster);
      if (!naechster?.startIso) return setRest(null);
      const diff = new Date(naechster.startIso).getTime() - jetzt;
      setRest({
        t: Math.floor(diff / 86400000),
        s: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    };
    rechne();
    const takt = window.setInterval(rechne, 30000);
    return () => window.clearInterval(takt);
  }, []);

  if (!rest || !termin) return null;

  const name = termin.name;
  const unterzeile = termin.dateLabel
    ? `${termin.dateLabel}${termin.beschreibung ? ` - ${termin.beschreibung}` : ""}`
    : (termin.beschreibung ?? "");

  // ALLE DREI FELDER, IMMER (Tim, 25.08.2026). Ich hatte führende Nullen
  // weggelassen, weil "00 Tage 00 Stunden 53 Minuten" wie ein Fehler
  // aussah. Tim will die Tage sehen, auch wenn dort eine Null steht - ein
  // Countdown, bei dem Felder verschwinden, springt im Layout und man
  // verliert das Gefühl für die Grössenordnung.
  //
  // Der Singular bleibt: "1 Tag" statt "1 Tage".
  const felder: [string, string][] = [
    [String(rest.t).padStart(2, "0"), rest.t === 1 ? "Tag" : "Tage"],
    [String(rest.s).padStart(2, "0"), rest.s === 1 ? "Stunde" : "Stunden"],
    [String(rest.m).padStart(2, "0"), rest.m === 1 ? "Minute" : "Minuten"],
  ];

  return (
    <div className="schrift-normal my-16 bg-[radial-gradient(ellipse_48%_42%_at_50%_58%,rgba(255,46,151,0.2),transparent_74%),radial-gradient(ellipse_34%_30%_at_76%_52%,rgba(2,240,209,0.1),transparent_72%)] px-4 py-16 text-center sm:py-20">
      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#86868b]">
        Nächstes Event
      </div>
      <Link href={href} className="mt-2.5 block">
        <span
          // Der Verlauf malt nur innerhalb des Kastens. Bei einer
          // Zeilenhöhe von 1.05 ragt die Unterlänge des "g" darunter
          // hinaus und blieb unsichtbar (gemessen: 11.7px bei 72px
          // Schrift, Tim 23.08.2026). Das Polster gibt dem Kasten
          // Platz, der negative Aussenabstand nimmt ihn dem Layout
          // wieder weg - die Seite verschiebt sich also nicht.
          className={`${VERLAUFSTEXT} mx-auto block pb-[0.18em] mb-[-0.18em] text-[36px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[56px] lg:text-[72px]`}
        >
          {name}.
        </span>
      </Link>
      <p className="mx-auto mt-3 max-w-[620px] text-[16px] text-[#a1a1a6] sm:text-[21px]">{unterzeile}</p>
      <div className="mt-8 flex justify-center gap-3.5">
        {felder.map(([zahl, wort]) => (
          <div
            key={wort}
            className="min-w-[86px] rounded-[18px] border border-white/[0.22] bg-white/[0.12] px-5 py-4 backdrop-blur-[14px] sm:min-w-[104px]"
          >
            <div className="text-[28px] font-bold [font-variant-numeric:tabular-nums] sm:text-[40px]">
              {zahl}
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-[#a1a1a6] sm:text-[12px]">
              {wort}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
