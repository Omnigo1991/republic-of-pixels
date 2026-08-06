import { getTopStory, getPopularArticles, getChronological } from "@/lib/articles";
import { TopStory } from "@/components/TopStory";
import { PopularSection } from "@/components/PopularSection";
import { NewsListe } from "@/components/NewsListe";
import { CategoryChipBar } from "@/components/CategoryChipBar";
import { ReleaseRadar } from "@/components/ReleaseRadar";
import { PixelDivider } from "@/components/PixelDivider";
import { Reveal } from "@/components/Reveal";
import { Masthead } from "@/components/Masthead";

export default function HomePage() {
  const topStory = getTopStory();
  const popular = getPopularArticles(8);
  const chronological = getChronological(topStory.slug);

  return (
    <>
      <Masthead variant="brand" />
      {/* Top-Story ohne Reveal: sofort sichtbar. */}
      <section className="bg-navy">
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

        <section className="py-10">
          <Reveal>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-text-primary">
                Alle News
              </h2>
              <span className="text-xs text-text-tertiary">Chronologisch, neueste zuerst</span>
            </div>
            <PixelDivider />
          </Reveal>
          <NewsListe articles={chronological} />
        </section>
      </div>
    </>
  );
}
