// Signatur-Motiv (Betreiber-Entscheidung 06.08.2026): eine ausblassende
// Pixelreihe unter Sektionsüberschriften statt einer schlichten Linie —
// löst den Markennamen "Pixels" visuell ein, dezent statt retro-verspielt.
const OPACITIES = [1, 1, 1, 1, 0.75, 0.55, 0.38, 0.24, 0.12, 0.05];

export function PixelDivider() {
  return (
    <div className="mb-6 flex gap-1.5" aria-hidden="true">
      {OPACITIES.map((opacity, i) => (
        <span key={i} className="h-[10px] w-[10px] bg-accent" style={{ opacity }} />
      ))}
    </div>
  );
}
