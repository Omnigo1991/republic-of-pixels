"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VERLAUFSTEXT } from "./Bausteine";

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

/** gamescom-Countdown: Keynote-Moment zwischen den Sektionen. */
export function EventCountdown({
  name = "gamescom 2026",
  zielIso = "2026-08-25T18:00:00Z",
  unterzeile = "Opening Night Live am 25. August, 20:00 Uhr - wir berichten live.",
  href = "/#radare",
}: {
  name?: string;
  zielIso?: string;
  unterzeile?: string;
  href?: string;
}) {
  const [rest, setRest] = useState<{ t: number; s: number; m: number } | null>(null);

  useEffect(() => {
    // Erst im Browser rechnen: Der Server kennt die Uhrzeit des Lesers
    // nicht, und eine vorgerenderte Zahl wäre beim Aufschlagen falsch.
    const rechne = () => {
      const diff = new Date(zielIso).getTime() - Date.now();
      if (diff <= 0) return setRest({ t: 0, s: 0, m: 0 });
      setRest({
        t: Math.floor(diff / 86400000),
        s: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    };
    rechne();
    const takt = window.setInterval(rechne, 30000);
    return () => window.clearInterval(takt);
  }, [zielIso]);

  if (!rest || (rest.t === 0 && rest.s === 0 && rest.m === 0)) return null;

  const felder: [string, string][] = [
    [String(rest.t).padStart(2, "0"), "Tage"],
    [String(rest.s).padStart(2, "0"), "Stunden"],
    [String(rest.m).padStart(2, "0"), "Minuten"],
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
