import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { splitTitle } from "@/lib/format";

// HELD IN KARTEN-ANATOMIE (Tim, 15.08.2026 spät): dieselbe Zweiteilung
// wie die NotchKarten — Artwork oben KOMPLETT unangetastet, weicher
// 48px-Übergang, Navy-Textzone mit Kicker, grossem Titel und
// Autorenzeile — nur eben in Heldengrösse.
export function TopStory({ article }: { article: Article }) {
  const { kicker, headline } = splitTitle(article.title, article.tags);
  return (
    <Link href={`/artikel/${article.slug}`} className="group block">
      <div className="treppe-tl">
        <div className="treppe-innen flex flex-col">
          <div className="relative h-[300px] shrink-0 overflow-hidden sm:h-[380px] lg:h-[440px] [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
            <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.02]">
              <ArticleMedia article={article} priority sizes="(max-width: 1024px) 100vw, 64vw" className="h-full w-full" />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
              style={{ background: "linear-gradient(180deg, transparent 0%, rgba(15,14,32,0.03) 35%, rgba(15,14,32,0.14) 60%, rgba(15,14,32,0.5) 82%, #0F0E20 100%)" }}
            />
          </div>
          <div className="px-5 pb-5 pt-3 sm:px-7 sm:pb-6 sm:pt-4">
            {kicker && (
              <p className="mb-2 text-[13px] font-extrabold tracking-[0.08em] text-accent">
                {kicker.toUpperCase()}
              </p>
            )}
            <h1 className="text-[24px]/[1.25] font-black tracking-[-0.015em] text-white sm:text-[30px]/[1.25] lg:text-[34px]/[1.25]">
              {headline}
            </h1>
          </div>
        </div>
      </div>
    </Link>
  );
}
