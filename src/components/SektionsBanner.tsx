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

  return (
    <div className={`mb-5 ${className}`}>
      <svg
        viewBox={`0 0 ${breite} 100`}
        width={breite}
        height={100}
        role="heading"
        aria-level={2}
        aria-label={`${titel} ${cyan}`}
        id={id}
        className="block h-auto w-full max-w-[660px] overflow-visible"
      >
        <text
          x="0"
          y="78"
          textLength={breite}
          lengthAdjust="spacingAndGlyphs"
          fontSize="100"
          fontWeight="900"
          letterSpacing="-2"
          fontFamily="var(--font-inter), Inter, system-ui, sans-serif"
        >
          <tspan fill="currentColor">{links}</tspan>
          <tspan fill="#02F0D1">{trenner + rechts}</tspan>
        </text>
      </svg>
    </div>
  );
}
