import type { Metadata } from "next";
import { getTopStory, getChronological, getByCategory, getPopularArticlesLive } from "@/lib/articles";
import { TopStory } from "@/components/TopStory";
import { NewsListe } from "@/components/NewsListe";
import { NeuesteRail, NotchKarte, TickerBand, NewsletterBlock, SektionsKopf, MehrPille } from "@/components/StartseiteNeu";
import { SektionsBanner } from "@/components/SektionsBanner";
import { PopularSection } from "@/components/PopularSection";
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
  // Kleine Slider-Leiste vor den News (Tim, 19.08.2026) — dieselbe
  // Stelle wie auf der Live-Seite.
  const beliebt = await getPopularArticlesLive(8);

  return (
    <>
      <Masthead variant="brand" />
      <section>
        {/* Willkommensgruss ueber dem Aufmacher (Tim, 18.08.2026): jetzt
            in derselben Sektionsbeschriftung wie alle anderen Sektionen,
            nicht mehr in Handschrift. Die Abstaende Kopf→Gruss und
            Gruss→Aufmacher bleiben gleich gross und sind an der
            gerenderten Schriftflaeche nachgemessen. */}
        <div className="mx-auto max-w-content px-4 pt-[42px] sm:px-6 sm:pt-[52px] lg:px-8">
          <SektionsBanner titel="Willkommen in der" cyan="Republic" className="mb-[41px] sm:mb-[52px]" />
          <div className="grid gap-8 lg:grid-cols-[1fr_372px] lg:gap-11">
            <div>
              <TopStory article={topStory} />
              {/* Auf dem Handy nur EINE Karte, damit "Alle News" schneller
                  kommt (Tim, 16.08.2026) — ab sm wieder alle drei. */}
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                {kleinreihe.map((a, i) => (
                  <div key={a.slug} className={i > 0 ? "hidden sm:block" : ""}>
                    <NotchKarte article={a} />
                  </div>
                ))}
              </div>
            </div>
            <NeuesteRail articles={rail} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <Reveal>
          <PopularSection articles={beliebt} />
        </Reveal>

        <section id="news" className="scroll-mt-16 lg:scroll-mt-[88px] pt-14 sm:pt-16">
          <Reveal>
            <SektionsBanner titel="News aus der" cyan="Republic" />
            <SektionsKopf titel="Alle News" />
            <SectionDivider />
            <NewsListe articles={chronological} />
          </Reveal>
        </section>

        {/* Newsletter direkt nach den News (Tim, 16.08.2026), als Kachel
            in der Inhaltsspalte wie bei Polygon — nicht randlos. */}
        <div className="mt-14 sm:mt-16">
          <NewsletterBlock artikelBilder={[topStory, ...kleinreihe].slice(0, 3)} />
        </div>

        <section id="guides" className="scroll-mt-16 lg:scroll-mt-[88px] pt-14 sm:pt-16">
          <Reveal>
            <SektionsBanner titel="Die grossen Republic-" cyan="Guides" />
            <SektionsKopf titel="Alle Guides" />
            <SectionDivider />
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-5">
              {guideReihe.map((a) => (
                <NotchKarte key={a.slug} article={a} bildHoehe="h-[250px]" randCyan />
              ))}
            </div>
            {/* Gleiche Pille und derselbe Abstand (mt-8) wie unter der
                Nachrichtenliste — Tim, 19.08.2026. */}
            <MehrPille href="/guides" />
          </Reveal>
        </section>

        {/* Ein Dach ueber die vier Radare (Tim, 17.08.2026): oben der
            Sektionstitel im Bannerstil, darunter die Radare mit ihren
            schlichten Ueberschriften wie auf der Live-Seite. */}
        <section id="radare" className="scroll-mt-16 lg:scroll-mt-[88px] pt-14 sm:pt-16">
          <Reveal>
            <SektionsBanner titel="Die Republic-" cyan="Radare" />
          </Reveal>
          <Reveal>
            <ReleaseRadar />
          </Reveal>
          <Reveal>
            <EventRadar />
          </Reveal>
          <Reveal>
            <ChartsRadar />
          </Reveal>
          <Reveal>
            <DealRadar />
          </Reveal>
        </section>

        <Reveal>
          <GeradeImGespraech />
        </Reveal>

        {/* Zweites Dach (Tim, 17.08.2026): Merkliste und Pixel-Raten sind
            beide persoenlich — was DU dir gemerkt hast, was DU raetst.
            Sie stehen deshalb unter einem gemeinsamen Titel. */}
        <section className="pt-14 sm:pt-16">
          <Reveal>
            <SektionsBanner titel="Deine" cyan="Republic" />
          </Reveal>
          <Reveal>
            <DeineMerkliste />
          </Reveal>
          <Reveal>
            <PixelRaten />
          </Reveal>
        </section>
      </div>

      <div className="mt-16">
        <TickerBand articles={ticker} />
      </div>
    </>
  );
}
