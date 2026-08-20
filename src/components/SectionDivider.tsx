// Signatur-Motiv (Betreiber-Entscheidung 06.08.2026, Konzept 2 von 5
// Sektionsleisten-Alternativen): durchgehende, dünne Cyan-Linie über die
// volle Breite unter Sektionsüberschriften - löst den vorherigen kurzen
// Strich ab, wirkt wie ein durchgehendes Band statt eines Akzents.
export function SectionDivider() {
  return <div aria-hidden="true" className="mb-6 h-0.5 w-full bg-accent" />;
}
