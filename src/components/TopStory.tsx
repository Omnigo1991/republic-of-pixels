import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { splitTitle } from "@/lib/format";

// HELL-UMBAU (15.08.2026, abgenommener Polygon-Entwurf): Der Held ist eine
// grosse Karte mit Pixel-Treppen-Rahmen.
// Das Artwork bleibt KOMPLETT unangetastet (Tim, 15.08.2026: "gar nicht
// abdunkeln") — die Schlagzeile steht als weisse Zeilen auf opaken
// Navy-Streifen, die Raute ist bewusst gestrichen.
export function TopStory({ article }: { article: Article }) {
  const { headline } = splitTitle(article.title, article.tags);
  return (
    <Link href={`/artikel/${article.slug}`} className="group block">
      <div className="treppe-tl">
        <div className="treppe-innen h-[420px] sm:h-[480px] lg:h-[560px]">
          <div className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover transition-transform duration-700 group-hover:scale-[1.02]">
            <ArticleMedia article={article} priority sizes="(max-width: 1024px) 100vw, 64vw" className="h-full w-full" />
          </div>
          <div className="absolute bottom-6 left-0 max-w-[86%] sm:bottom-9">
            <h1 className="inline bg-[#0C0B1A] px-3 py-0 text-[26px] font-black leading-[1.65] tracking-[-0.01em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone] sm:px-4 sm:text-4xl lg:text-[42px]">
            {headline}
            </h1>
          </div>
        </div>
      </div>
    </Link>
  );
}
