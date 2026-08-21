"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Sektionstitel als SVG-Schriftzug (Tim, 17.08.2026): fett, versal, ueber
// die Spaltenbreite gezogen, letztes Wort in Cyan.
//
// Warum SVG und nicht einfach eine grosse Ueberschrift: Die Breite soll
// sich der Spalte anpassen, ohne dass die Schriftgroesse in Stufen
// springt. Im SVG uebernimmt das viewBox - ein einziger <text>-Knoten
// wird auf die Kastenbreite skaliert, die Buchstabenabstaende bleiben
// dabei im Verhaeltnis erhalten.
//
// Beide Teile stehen in EINEM <text>: Zwei getrennte <text>-Knoten mit
// eigenem textLength haben in der Entwurfsfassung dazu gefuehrt, dass
// ein kurzes erstes Wort auf ein Drittel der Breite auseinandergezogen
// wurde ("DIE" so breit wie "RADARE").

export function SektionsBanner({
  titel,
  cyan,
  id,
  className = "",
}: {
  /** Der weisse Teil, z. B. "News aus der" */
  titel: string;
  /** Der Cyan-Teil am Ende, z. B. "Republic" */
  cyan: string;
  /** Fuer aria-labelledby der Sektion */
  id?: string;
  className?: string;
}) {
  const textRef = useRef<SVGTextElement>(null);
  const [gemessen, setGemessen] = useState<number | null>(null);

  const links = titel.toUpperCase();
  const rechts = cyan.toUpperCase();
  // Kein Leerzeichen, wenn der erste Teil auf einem Bindestrich endet
  // ("REPUBLIC-" + "GUIDES").
  const trenner = links.endsWith("-") ? "" : " ";
  const zeichen = links.length + trenner.length + rechts.length;

  // ERST SCHAETZEN, DANN MESSEN (Tim, 21.08.2026, Edge-Fehler): Vorher
  // wurde der Text per textLength auf eine GESCHAETZTE Breite gezwungen
  // (72 px pro Zeichen). Laedt der Browser eine andere Schrift - Edge
  // mit erzwungenen Schriftarten, Schrift noch nicht geladen -, wird
  // der Text auf die falsche Breite auseinandergezogen oder gestaucht,
  // und die Banner sind unterschiedlich gross. Jetzt: Schaetzung nur
  // fuers erste Bild, danach misst getComputedTextLength() die ECHTE
  // Breite und der Kasten schmiegt sich an. Kein textLength mehr -
  // damit gibt es nichts mehr, was ziehen koennte.
  const schaetzung = Math.min(1536, Math.round(zeichen * 68));
  const breite = gemessen ?? schaetzung;

  useLayoutEffect(() => {
    const t = textRef.current;
    if (!t) return;
    const messen = () => {
      const l = t.getComputedTextLength();
      if (l > 0) setGemessen((alt) => (alt !== null && Math.abs(alt - l) < 1 ? alt : Math.ceil(l + 2)));
    };
    messen();
    // Nachmessen, sobald die echte Schrift da ist.
    document.fonts?.ready?.then(messen).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titel, cyan]);

  // WICHTIG: Die Schrifthoehe muss konstant sein, nicht die Kastenbreite.
  // Vorher war die Breite auf 660 px begrenzt - ein kurzer Titel wie
  // "DEINE REPUBLIC" wurde dadurch auf dieselbe Breite gezogen wie
  // "NEWS AUS DER REPUBLIC" und erschien deutlich groesser. Jetzt gibt
  // 0.43 die Skalierung vor (1536 × 0.43 = 660 px, die gemessene Breite
  // des Banners auf der Live-Seite bei 43 px Schrifthoehe); kurze Titel
  // werden dadurch schmaler statt groesser.
  const zielBreite = Math.round(breite * 0.43);

  const schriftMerkmale = {
    fontSize: 100,
    fontWeight: 900,
    letterSpacing: -2,
    fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
  } as const;

  // Skalierung: 0.43 am Desktop (1536 × 0.43 = 660 px, die gemessene
  // Breite der Live-Seite), 0.23 am Handy. Bei 0.23 passt selbst der
  // laengste Titel einzeilig auf 390 px UND alle Banner werden exakt
  // gleich hoch - bei 0.28 war der kuerzeste 5 px hoeher, weil er die
  // Breitenbegrenzung nicht erreichte (Tim, 20.08.2026).
  return (
    <div
      className={`banner mb-5 ${className}`}
      style={{ ["--bw" as string]: `${Math.round(breite * 0.43)}px`,
               ["--bw-klein" as string]: `${Math.round(breite * 0.23)}px` }}
    >
      <svg
        viewBox={`0 0 ${breite} 100`}
        role="heading"
        aria-level={2}
        aria-label={`${titel} ${cyan}`}
        id={id}
        className="block h-auto overflow-visible"
      >
        <text ref={textRef} x="0" y="78" {...schriftMerkmale}>
          <tspan fill="currentColor">{links}</tspan>
          <tspan fill="#02F0D1">{trenner + rechts}</tspan>
        </text>
      </svg>
    </div>
  );
}
