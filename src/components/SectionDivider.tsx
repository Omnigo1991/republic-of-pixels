// Signatur-Motiv (Betreiber-Entscheidung 06.08.2026, Variante 2 von 10
// Alternativen): kurzer, dicker Cyan-Strich unter Sektionsüberschriften —
// ruhiger und redaktioneller als die vorherige ausblassende Pixelreihe.
export function SectionDivider() {
  return <div aria-hidden="true" className="mb-6 h-[3px] w-10 rounded-full bg-accent" />;
}
