// Sektionstitel als SVG-Schriftzug (Tim, 17.08.2026): fett, versal, ueber
// die Spaltenbreite gezogen, letztes Wort in Cyan.
//
// Warum SVG und nicht einfach eine grosse Ueberschrift: Die Breite soll
// sich der Spalte anpassen, ohne dass die Schriftgroesse in Stufen
// springt. Im SVG uebernimmt das viewBox — ein einziger <text>-Knoten
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
  const links = titel.toUpperCase();
  const rechts = cyan.toUpperCase();
  // Kein Leerzeichen, wenn der erste Teil auf einem Bindestrich endet
  // ("REPUBLIC-" + "GUIDES").
  const trenner = links.endsWith("-") ? "" : " ";
  const zeichen = links.length + trenner.length + rechts.length;

  // 72 = gemessene Durchschnittsbreite eines Zeichens bei font-size 100
  // in Inter Black. Der Faktor 1.12 erlaubt hoechstens 12 % Dehnung —
  // darueber wirkt die Schrift verzogen statt gesetzt.
  const breite = Math.min(1536, Math.round(zeichen * 72 * 1.12));

  // WICHTIG: Die Schrifthoehe muss konstant sein, nicht die Kastenbreite.
  // Vorher war die Breite auf 660 px begrenzt — ein kurzer Titel wie
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

  return (
    <div className={`mb-5 ${className}`}>
      {/* Einzeilig ab 640 px */}
      <svg
        viewBox={`0 0 ${breite} 100`}
        role="heading"
        aria-level={2}
        aria-label={`${titel} ${cyan}`}
        id={id}
        style={{ width: `min(100%, ${zielBreite}px)` }}
        className="hidden h-auto overflow-visible sm:block"
      >
        <text x="0" y="78" textLength={breite} lengthAdjust="spacingAndGlyphs" {...schriftMerkmale}>
          <tspan fill="currentColor">{links}</tspan>
          <tspan fill="#02F0D1">{trenner + rechts}</tspan>
        </text>
      </svg>

      {/* Auf dem Handy KEIN SVG: Ein gedehnter Schriftzug auf 358 px
          Breite faellt je nach Titellaenge auf 23 bis 45 px Hoehe — die
          Groesse haengt dann an der Zeichenzahl statt an der Gestaltung.
          Echter Text bricht stattdessen um und behaelt ueberall
          dieselbe Groesse. */}
      <h2 className="text-[30px] font-black uppercase leading-[0.95] tracking-[-0.03em] text-text-primary sm:hidden">
        {links}
        {trenner}
        <span className="text-accent">{rechts}</span>
      </h2>
    </div>
  );
}
