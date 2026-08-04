import { getTopStory, getPopularArticles, getChronological } from "@/lib/articles";
import { TopStory } from "@/components/TopStory";
import { PopularSection } from "@/components/PopularSection";
import { ArticleListItem } from "@/components/ArticleListItem";
import { CategoryChipBar } from "@/components/CategoryChipBar";
import { Reveal } from "@/components/Reveal";

export default function HomePage() {
  const topStory = getTopStory();
  const popular = getPopularArticles(5);
  const chronological = getChronological(topStory.slug);

  return (
    <>
      <CategoryChipBar active="alle" />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        {/* Top-Story bleibt ohne Reveal — der Einstieg muss sofort sichtbar sein. */}
        <section className="py-8 sm:py-12">
          <TopStory article={topStory} />
        </section>

        <div className="h-px w-full bg-border-subtle" />

        <Reveal>
          <PopularSection articles={popular} />
        </Reveal>

        <div className="h-px w-full bg-border-subtle" />

        <section className="py-10">
          <Reveal>
            <h2 className="mb-2 text-xl font-semibold tracking-tight text-text-primary">
              Alle News
            </h2>
            <p className="mb-6 text-sm text-text-tertiary">
              Chronologisch, neueste zuerst
            </p>
          </Reveal>
          <div className="flex flex-col">
            {chronological.map((article, i) => (
              <Reveal key={article.slug} delayMs={(i % 3) * 80}>
                <ArticleListItem article={article} />
              </Reveal>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
