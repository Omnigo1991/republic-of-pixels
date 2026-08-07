import { getTopStory, getPopularArticlesLive, getChronological } from "@/lib/articles";
import { TopStory } from "@/components/TopStory";
import { PopularSection } from "@/components/PopularSection";
import { NewsListe } from "@/components/NewsListe";
import { CategoryChipBar } from "@/components/CategoryChipBar";
import { ReleaseRadar } from "@/components/ReleaseRadar";
import { DealRadar } from "@/components/DealRadar";
import { GeradeImGespraech } from "@/components/GeradeImGespraech";
import { DeineMerkliste } from "@/components/DeineMerkliste";
import { SectionDivider } from "@/components/SectionDivider";
import { Reveal } from "@/components/Reveal";
import { Masthead } from "@/components/Masthead";

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
        <Reveal>
          <PopularSection articles={popular} />
        </Reveal>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <ReleaseRadar />
        </Reveal>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <DealRadar />
        </Reveal>

        <div className="h-px w-full bg-border-subtle" />

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

        <GeradeImGespraech />
        <DeineMerkliste />
      </div>
    </>
  );
}
