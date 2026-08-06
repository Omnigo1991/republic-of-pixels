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
            <h2 className="mb-2 text-xl font-semibold tracking-tight text-text-primary">
              Alle News
            </h2>
            <p className="mb-3 text-sm text-text-tertiary">
              Chronologisch, neueste zuerst
            </p>
            <PixelDivider />
          </Reveal>
          <NewsListe articles={chronological} />
        </section>
      </div>
    </>
  );
}
