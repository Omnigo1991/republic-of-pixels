import type { Metadata } from "next";
import { getTopStory, getChronological, getPopularArticlesLive, getAllArticles } from "@/lib/articles";
import { Reveal } from "@/components/Reveal";
import { KinoHero, BeliebtSlider } from "@/components/next/KinoHero";
import { BentoMosaik } from "@/components/next/BentoMosaik";
import { EventCountdown } from "@/components/next/SektionsTitel";
import { RadarBento } from "@/components/next/RadarBento";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// STARTSEITE NACH DEM ABGENOMMENEN ENTWURF (Tim, 22.08.2026: "genau so
// wie der Entwurf - EXAKT"): Kino-Hero, Beliebt-Reihe, Bento-Mosaik mit
// Meldungsspalte, gamescom-Countdown, die Radare als Glaskarten, zum
// Schluss Pixel-Raten neben dem Newsletter. Die Sektionen der alten
// Seite (chronologische Newsliste, Guides-Reihe, Patch-Radar, Gerade im
// Gespräch, Merkliste) kennt der Entwurf nicht - sie sind entfallen.
export default async function HomePage() {
  const topStory = getTopStory();
  const chronological = getChronological(topStory.slug);
  const kleinreihe = chronological.slice(0, 3);
  const beliebt = await getPopularArticlesLive(8);

  const obenGezeigt = new Set([topStory.slug, ...kleinreihe.map((a) => a.slug), ...beliebt.map((a) => a.slug)]);
  const fuersMosaik = chronological.filter((a) => !obenGezeigt.has(a.slug));
  const bentoKacheln = fuersMosaik.slice(0, 14);
  const bentoMeldungen = fuersMosaik.slice(14, 23);

  // Wertungs-Radar aus unseren eigenen Tests - keine erfundenen Zahlen.
  const getestete = getAllArticles()
    .filter((a) => a.review)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  return (
    <>
      <KinoHero artikel={topStory} weitere={kleinreihe} />
      <BeliebtSlider artikel={beliebt} />
      <BentoMosaik kacheln={bentoKacheln} meldungen={bentoMeldungen} />

      <EventCountdown />

      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <section id="radare" className="scroll-mt-24">
          <Reveal>
            <RadarBento getestete={getestete} />
          </Reveal>
        </section>

      </div>
    </>
  );
}
