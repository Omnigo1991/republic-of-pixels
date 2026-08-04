import { getTopStory, getPopularArticles, getChronological } from "@/lib/articles";
import { TopStory } from "@/components/TopStory";
import { PopularSection } from "@/components/PopularSection";
import { ArticleListItem } from "@/components/ArticleListItem";
import { CategoryChipBar } from "@/components/CategoryChipBar";

export default function HomePage() {
  const topStory = getTopStory();
  const popular = getPopularArticles(5);
  const chronological = getChronological(topStory.slug);

  return (
    <>
      <CategoryChipBar active="alle" />
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <section className="py-8 sm:py-12">
          <TopStory article={topStory} />
        </section>

        <div className="h-px w-full bg-border-subtle" />

        <PopularSection articles={popular} />

        <div className="h-px w-full bg-border-subtle" />

        <section className="py-10">
          <h2 className="mb-2 text-xl font-semibold tracking-tight text-text-primary">
            Alle News
          </h2>
          <p className="mb-6 text-sm text-text-tertiary">
            Chronologisch, neueste zuerst
          </p>
          <div className="flex flex-col">
            {chronological.map((article) => (
              <ArticleListItem key={article.slug} article={article} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
