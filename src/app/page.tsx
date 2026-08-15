import type { Metadata } from "next";
import { getTopStory, getChronological, getByCategory } from "@/lib/articles";
import { TopStory } from "@/components/TopStory";
import { NewsListe } from "@/components/NewsListe";
import { NeuesteRail, NotchKarte, TickerBand, NewsletterBlock, SektionsKopf } from "@/components/StartseiteNeu";
import { ReleaseRadar } from "@/components/ReleaseRadar";
import { DealRadar } from "@/components/DealRadar";
import { ChartsRadar } from "@/components/ChartsRadar";
import { EventRadar } from "@/components/EventRadar";
import { GeradeImGespraech } from "@/components/GeradeImGespraech";
import { PixelRaten } from "@/components/PixelRaten";
import { DeineMerkliste } from "@/components/DeineMerkliste";
import { SectionDivider } from "@/components/SectionDivider";
import { Reveal } from "@/components/Reveal";
import { Masthead } from "@/components/Masthead";

// Canonical gegen Host-Duplikate (Google-Meldung 08.08.2026): die
// Startseite deklariert ihre Originaladresse explizit.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// HELL-UMBAU (Tim-Freigabe 15.08.2026, abgenommener Polygon-Entwurf):
// Held mit Pixel-Treppe + "Neueste"-Spalte daneben, drei beschriftete
// Karten darunter, Guide-Kartenreihe, dann die Radare, das Cyan-Band und
// der Navy-Newsletter-Block. "Alle News" bleibt erhalten (Kernprodukt,
// stand nicht im Entwurf, fliegt aber nicht raus) — "Beliebt bei Lesern"
// ist bewusst gewichen: Die Neueste-Spalte übernimmt die Aktualität.
export default async function HomePage() {
  const topStory = getTopStory();
  const chronological = getChronological(topStory.slug);
  const rail = chronological.slice(0, 5);
  const kleinreihe = chronological.slice(5, 8);
  const guides = getByCategory("guides");
  // Guide-Reihe: echte Guides zuerst, aufgefüllt mit den neuesten
  // Meldungen, bis fünf Karten stehen.
  const guideReihe = [
    ...guides,
    ...chronological.filter((a) => a.category !== "guides").slice(8, 8 + Math.max(0, 5 - guides.length)),
  ].slice(0, 5);
  const ticker = chronological.slice(0, 2);

  return (
    <>
      <Masthead variant="brand" />
      <section>
        <div className="mx-auto max-w-content px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_372px] lg:gap-11">
            <div>
              <TopStory article={topStory} />
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                {kleinreihe.map((a) => (
                  <NotchKarte key={a.slug} article={a} />
                ))}
              </div>
            </div>
            <NeuesteRail articles={rail} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <section id="news" className="scroll-mt-16 lg:scroll-mt-[88px] pt-14 sm:pt-16">
          <Reveal>
            <SektionsKopf titel="Alle News" mehrHref="/kategorie/news" hinweis="Chronologisch, neueste zuerst" />
            <SectionDivider />
            <NewsListe articles={chronological} />
          </Reveal>
        </section>

        <section id="guides" className="scroll-mt-16 lg:scroll-mt-[88px] pt-14 sm:pt-16">
          <Reveal>
            <SektionsKopf titel="Die grossen Republic-Guides" mehrHref="/guides" />
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5">
              {guideReihe.map((a) => (
                <NotchKarte key={a.slug} article={a} bildHoehe="h-[250px]" />
              ))}
            </div>
          </Reveal>
        </section>

        <div id="radare" className="scroll-mt-16 lg:scroll-mt-[88px]">
        <Reveal>
          <ReleaseRadar />
        </Reveal>
        </div>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <EventRadar />
        </Reveal>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <ChartsRadar />
        </Reveal>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <DealRadar />
        </Reveal>

        <Reveal>
          <GeradeImGespraech />
        </Reveal>
        <Reveal>
          <DeineMerkliste />
        </Reveal>
        <Reveal>
          <PixelRaten />
        </Reveal>
      </div>

      <div className="mt-16">
        <TickerBand articles={ticker} />
        <NewsletterBlock artikelBilder={[topStory, ...kleinreihe].slice(0, 3)} />
      </div>
    </>
  );
}
