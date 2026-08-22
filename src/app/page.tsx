import type { Metadata } from "next";
import { getTopStory, getChronological, getByCategory, getPopularArticlesLive } from "@/lib/articles";
import { NewsListe } from "@/components/NewsListe";
import { NotchKarte, NewsletterBlock, SektionsKopf, MehrPille } from "@/components/StartseiteNeu";
import { SektionsBanner } from "@/components/SektionsBanner";
import { ReleaseRadar } from "@/components/ReleaseRadar";
import { DealRadar } from "@/components/DealRadar";
import { PatchRadar } from "@/components/PatchRadar";
import { ChartsRadar } from "@/components/ChartsRadar";
import { EventRadar } from "@/components/EventRadar";
import { GeradeImGespraech } from "@/components/GeradeImGespraech";
import { PixelRaten } from "@/components/PixelRaten";
import { DeineMerkliste } from "@/components/DeineMerkliste";
import { SectionDivider } from "@/components/SectionDivider";
import { Reveal } from "@/components/Reveal";
import { Masthead } from "@/components/Masthead";
import { KinoHero, BeliebtSlider } from "@/components/next/KinoHero";
import { BentoMosaik } from "@/components/next/BentoMosaik";

// Canonical gegen Host-Duplikate (Google-Meldung 08.08.2026): die
// Startseite deklariert ihre Originaladresse explizit.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// HELL-UMBAU (Tim-Freigabe 15.08.2026, abgenommener Polygon-Entwurf):
// Held mit Pixel-Treppe + "Neueste"-Spalte daneben, drei beschriftete
// Karten darunter, Guide-Kartenreihe, dann die Radare, das Cyan-Band und
// der Navy-Newsletter-Block. "Alle News" bleibt erhalten (Kernprodukt,
// stand nicht im Entwurf, fliegt aber nicht raus) - "Beliebt bei Lesern"
// ist bewusst gewichen: Die Neueste-Spalte übernimmt die Aktualität.
export default async function HomePage() {
  const topStory = getTopStory();
  const chronological = getChronological(topStory.slug);
  const kleinreihe = chronological.slice(5, 8);
  const guides = getByCategory("guides");
  // Guide-Reihe: echte Guides zuerst, aufgefüllt mit den neuesten
  // Meldungen, bis fünf Karten stehen.
  const guideReihe = [
    ...guides,
    ...chronological.filter((a) => a.category !== "guides").slice(8, 8 + Math.max(0, 4 - guides.length)),
  ].slice(0, 4);
  // Kleine Slider-Leiste vor den News (Tim, 19.08.2026) - dieselbe
  // Stelle wie auf der Live-Seite.
  const beliebt = await getPopularArticlesLive(8);
  // Mosaik: 14 Bildkacheln, danach 9 Schlagzeilen für die Glasspalte.
  // Alles, was oben schon steht, fällt weg - nichts doppelt sich.
  const obenGezeigt = new Set([topStory.slug, ...kleinreihe.map((a) => a.slug), ...beliebt.map((a) => a.slug)]);
  const fuersMosaik = chronological.filter((a) => !obenGezeigt.has(a.slug));
  const bentoKacheln = fuersMosaik.slice(0, 14);
  const bentoMeldungen = fuersMosaik.slice(14, 23);

  return (
    <>
      <Masthead variant="brand" />
      {/* NEUES DESIGN (Tim-Freigabe 22.08.2026, Entwurf "Republic Next"):
          Kino-Hero mit dem Aufmacher über die volle Bühne, darunter die
          Beliebt-Reihe und das Bento-Mosaik. Der Tagesgruss entfällt hier
          - die Schlagzeile im Markenverlauf ist der Auftakt. */}
      <KinoHero artikel={topStory} weitere={kleinreihe} />
      <BeliebtSlider artikel={beliebt} />
      <BentoMosaik kacheln={bentoKacheln} meldungen={bentoMeldungen} />

      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <section id="news" className="scroll-mt-16 lg:scroll-mt-[88px] pt-14 sm:pt-16">
          <Reveal>
            <SektionsBanner titel="News aus der" cyan="Republic" />
            <SektionsKopf titel="Alle News" />
            <SectionDivider />
            <NewsListe articles={chronological} />
          </Reveal>
        </section>

        {/* Newsletter direkt nach den News (Tim, 16.08.2026), als Kachel
            in der Inhaltsspalte wie bei Polygon - nicht randlos. */}
        <div className="mt-14 sm:mt-16">
          <NewsletterBlock artikelBilder={[topStory, ...kleinreihe].slice(0, 3)} />
        </div>

        <section id="guides" className="scroll-mt-16 lg:scroll-mt-[88px] pt-14 sm:pt-16">
          <Reveal>
            <SektionsBanner titel="Die Republic-" cyan="Guides" />
            <SektionsKopf titel="Alle Guides" />
            <SectionDivider />
            {/* GLEICH GROSS WIE DIE KARTEN UNTER DEM HERO (Tim, 20.08.2026):
                vier Spalten auf voller Breite ergeben dieselbe Kartenbreite
                (~310 px) wie die Dreierreihe neben der Seitenleiste. */}
            <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
              {guideReihe.map((a) => (
                <NotchKarte key={a.slug} article={a} bildHoehe="aspect-[4/5] h-auto sm:aspect-auto sm:h-[280px]" randCyan />
              ))}
            </div>
            {/* Gleiche Pille und derselbe Abstand (mt-8) wie unter der
                Nachrichtenliste - Tim, 19.08.2026. */}
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
          <PatchRadar />
          </Reveal>
        </section>

        <Reveal>
          <GeradeImGespraech />
        </Reveal>

        {/* Zweites Dach (Tim, 17.08.2026): Merkliste und Pixel-Raten sind
            beide persoenlich - was DU dir gemerkt hast, was DU raetst.
            Sie stehen deshalb unter einem gemeinsamen Titel. */}
        <section className="pt-14 sm:pt-16">
          <Reveal>
            <SektionsBanner titel="Deine" cyan="Republic" />
          </Reveal>
          {/* MERKLEISTE UEBER DIE NACHBARSEKTION HEBEN (Tim, 20.08.2026):
              Jedes Reveal blendet mit einer Transformation ein und bildet
              dadurch eine eigene Stapelebene. Bei gleichrangigen Ebenen
              gewinnt die spaetere im Dokument - Pixel-Raten lag also ueber
              der Merkleiste, und ihre Vorschlagsliste verschwand dahinter.
              Ein hoeherer Wert an der Liste selbst half nicht: Er wirkt nur
              INNERHALB der eigenen Stapelebene. */}
          <Reveal className="relative z-20">
            <DeineMerkliste />
          </Reveal>
          <Reveal>
            <PixelRaten />
          </Reveal>
        </section>
      </div>

    </>
  );
}
