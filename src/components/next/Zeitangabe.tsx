"use client";

import { useEffect, useState } from "react";
import { kurzDatum, zeitSeit } from "@/lib/format";

// WIE ALT IST DIESE MELDUNG? (Tim, 29.08.2026)
//
// Aus dem Leserbericht: Auf der ganzen Startseite stand bei keinem einzigen
// Artikel, wann er erschienen ist. Bei einer Nachrichtenseite ist das die
// erste Frage überhaupt - ohne Angabe wirkt jede Meldung wie eine Konserve.
//
// WARUM IM BROWSER GERECHNET WIRD, NICHT AUF DEM SERVER:
//
// Die Startseite wird bei jedem Aufruf neu gerendert, aber Vercel legt die
// fertige Antwort bis zu 20 Minuten in den Zwischenspeicher (gemessen am
// 29.08.2026: x-vercel-cache HIT mit age 1058). Eine auf dem Server
// gerechnete Minutenangabe wäre damit regelmässig falsch - "vor 3 Min." bei
// einer Meldung, die längst eine halbe Stunde alt ist. Eine falsche
// Zeitangabe ist schlimmer als gar keine, denn sie sieht aus wie eine
// Zusicherung.
//
// KEIN FLACKERN BEIM LADEN: Der Server liefert das kurze Datum ("29. Aug"),
// und genau das gibt auch der erste Durchlauf im Browser zurück - der
// Zustand startet auf null. Erst danach setzt der Effekt die genaue Angabe.
// Damit stimmen Server- und Browser-Fassung beim Abgleich überein, es gibt
// keinen Hydration-Fehler und keinen Sprung.
//
// Der Takt von einer Minute hält "vor 3 Min." aktuell, solange jemand die
// Seite offen liegen lässt.
export function Zeitangabe({
  iso,
  className = "",
}: {
  iso: string;
  className?: string;
}) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const rechne = () => setText(zeitSeit(iso));
    rechne();
    const takt = window.setInterval(rechne, 60000);
    return () => window.clearInterval(takt);
  }, [iso]);

  return (
    <time dateTime={iso} className={className}>
      {text ?? kurzDatum(iso)}
    </time>
  );
}
