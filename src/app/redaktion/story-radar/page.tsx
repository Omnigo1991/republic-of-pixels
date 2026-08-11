import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { StoryRadar } from "@/components/StoryRadar";

// Eigene Seite statt Platz im Statistik-Cockpit (Tim, 11.08.2026): Ein
// Redaktionswerkzeug gehört nicht in die Besucherstatistik — das eine sagt,
// was wir schreiben sollten, das andere, wer uns liest.

export const metadata: Metadata = {
  title: "Redaktionswerkzeug",
  robots: { index: false },
};

export default function StoryRadarSeite() {
  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">Story-Radar</h1>
          <span className="shrink-0 text-xs text-text-tertiary">Was gerade hochkocht</span>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-text-secondary">
          Themen, über die unsere Quellen gerade berichten — und ob wir sie schon haben. Ein Klick
          auf „Nachziehen" legt das Thema in die Warteschlange; der nächste Pipeline-Lauf greift es
          bevorzugt auf.
        </p>
        <StoryRadar />
      </div>
    </>
  );
}
