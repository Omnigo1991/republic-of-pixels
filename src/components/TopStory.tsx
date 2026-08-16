import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { splitTitle } from "@/lib/format";

// HELD MIT POLYGON-SCRIM (15.08.2026, aus Polygons echtem CSS gemessen):
// Der Verlauf sitzt NUR auf der Textbox — untere Haelfte flach 80%
// Deckkraft, obere Haelfte laeuft auf null aus. Das Artwork selbst
// bleibt komplett unberuehrt.
export function TopStory({ article }: { article: Article }) {
  const { kicker, headline } = splitTitle(article.title, article.tags);
  return (
    <Link href={`/artikel/${article.slug}`} className="group block">
      <div className="treppe-tl">
        <div className="treppe-innen h-[430px] sm:h-[520px] lg:h-[600px]">
          <div className="absolute inset-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover transition-transform duration-700 group-hover:scale-[1.02]">
            <ArticleMedia article={article} priority sizes="(max-width: 1024px) 100vw, 64vw" className="h-full w-full" />
          </div>
          <div
            className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-[104px] sm:px-7 sm:pb-6 sm:pt-[120px]"
            style={{ background: "linear-gradient(0deg, #0F0E20 0px, #0F0E20 calc(100% - 120px), rgba(15,14,32,0.92) calc(100% - 104px), rgba(15,14,32,0.72) calc(100% - 78px), rgba(15,14,32,0.44) calc(100% - 52px), rgba(15,14,32,0.18) calc(100% - 26px), rgba(15,14,32,0) 100%)" }}
          >
            {kicker && (
              <p className="mb-2 text-[13px] font-extrabold tracking-[0.08em] text-accent">
                {kicker.toUpperCase()}
              </p>
            )}
            <h1 className="text-[26px]/[1.22] font-black tracking-[-0.015em] text-white sm:text-[34px]/[1.2] lg:text-[40px]/[1.18]">
              {headline}
            </h1>
          </div>
        </div>
      </div>
    </Link>
  );
}
