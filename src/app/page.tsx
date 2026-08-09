import type { Metadata } from "next";
import { getTopStory, getPopularArticlesLive, getChronological } from "@/lib/articles";
import { TopStory } from "@/components/TopStory";
import { PopularSection } from "@/components/PopularSection";
import { NewsListe } from "@/components/NewsListe";
import { CategoryChipBar } from "@/components/CategoryChipBar";
import { ReleaseRadar } from "@/components/ReleaseRadar";
import { DealRadar } from "@/components/DealRadar";
import { ChartsRadar } from "@/components/ChartsRadar";
import { EventRadar } from "@/components/EventRadar";
import { GeradeImGespraech } from "@/components/GeradeImGespraech";
import { DeineMerkliste } from "@/components/DeineMerkliste";
import { SectionDivider } from "@/components/SectionDivider";
import { Reveal } from "@/components/Reveal";
import { Masthead } from "@/components/Masthead";

// Canonical gegen Host-Duplikate (Google-Meldung 08.08.2026): die
// Startseite deklariert ihre Originaladresse explizit.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const topStory = getTopStory();
  const popular = await getPopularArticlesLive(8);
  const chronological = getChronological(topStory.slug);

  return (
    <>
      <Masthead variant="brand" />
      {/* Top-Story ohne Reveal: sofort sichtbar. Kein eigener Hintergrund mehr
          (vorher bg-navy) — lief auf #191919 statt #141414 wie der Rest der
          Seite und erzeugte einen sichtbaren "Cut" darunter. */}
      <section>
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <TopStory article={topStory} />
        </div>
      </section>

      <CategoryChipBar active="alle" />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        {/* Sektions-Dramaturgie (Tim-Freigabe 09.08.2026): erst die
            Nachrichten (Kernprodukt), dann der Blick nach vorn (Release +
            Event als Paar), dann der Puls (Charts), dann das Portemonnaie
            (Deals) — Community und Persönliches als Abschluss. */}
        <Reveal>
          <PopularSection articles={popular} />
        </Reveal>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <div className="pt-12 sm:pt-16">
            <p className="text-[length:calc((100vw-32px)*0.0651)] font-black uppercase leading-none tracking-[-0.02em] text-text-primary sm:text-[length:calc((100vw-48px)*0.0651)] lg:text-[length:calc((min(100vw,1280px)-104px)*0.036458)]">
              News aus der <span className="text-accent">Republic</span>
            </p>
          </div>
        </Reveal>

        <section className="py-10">
          <Reveal>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Alle News
              </h2>
              <span className="text-xs text-text-tertiary">Chronologisch, neueste zuerst</span>
            </div>
            <SectionDivider />
          </Reveal>
          <NewsListe articles={chronological} />
        </section>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <div className="pt-12 sm:pt-16">
            <p className="text-[length:calc((100vw-32px)*0.0651)] font-black uppercase leading-none tracking-[-0.02em] text-text-primary sm:text-[length:calc((100vw-48px)*0.0651)] lg:text-[length:calc((min(100vw,1280px)-104px)*0.036458)]">
              Die <span className="text-accent">Republic</span>-Radare
            </p>
          </div>
        </Reveal>

        <Reveal>
          <ReleaseRadar />
        </Reveal>

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

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <div className="pt-12 sm:pt-16">
            <p className="text-[length:calc((100vw-32px)*0.0651)] font-black uppercase leading-none tracking-[-0.02em] text-text-primary sm:text-[length:calc((100vw-48px)*0.0651)] lg:text-[length:calc((min(100vw,1280px)-104px)*0.036458)]">
              Deine <span className="text-accent">Republic</span>
            </p>
          </div>
        </Reveal>

        <GeradeImGespraech />
        <DeineMerkliste />
      </div>
    </>
  );
}
