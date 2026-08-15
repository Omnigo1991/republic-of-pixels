import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { splitTitle } from "@/lib/format";

// HELL-UMBAU (15.08.2026, abgenommener Polygon-Entwurf): Der Held ist eine
// grosse Karte mit Pixel-Treppen-Rahmen. Das Bild wird entfärbt und
// cyan/navy getönt, darüber liegt die grosse gedrehte Quadrat-Raute (unser
// Schmuckmotiv), die Schlagzeile steht als weisse Zeilen auf Navy-Streifen.
export function TopStory({ article }: { article: Article }) {
  const { headline } = splitTitle(article.title, article.tags);
  return (
    <Link href={`/artikel/${article.slug}`} className="group block">
      <div className="treppe-tl">
        <div className="treppe-innen h-[420px] sm:h-[480px] lg:h-[560px]">
          <div className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover [&_img]:grayscale [&_img]:brightness-[1.18] [&_img]:opacity-100 transition-transform duration-700 group-hover:scale-[1.02]">
            <ArticleMedia article={article} priority sizes="(max-width: 1024px) 100vw, 64vw" className="h-full w-full" />
          </div>
          {/* Cyan/Navy-Tönung über dem entfärbten Bild */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{ background: "linear-gradient(160deg, rgba(2,240,209,0.26), rgba(12,11,26,0.34))" }}
          />
          {/* Grosse gedrehte Quadrat-Raute */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[42%] h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-[8px] border-accent/40 mix-blend-screen sm:h-[330px] sm:w-[330px] sm:border-[10px]"
          />
          <div className="absolute bottom-6 left-0 max-w-[86%] sm:bottom-9">
            <h1 className="inline bg-[rgba(6,5,16,0.88)] px-3 py-0 text-[26px] font-black leading-[1.5] tracking-[-0.01em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone] sm:px-4 sm:text-4xl lg:text-[42px]">
            {headline}
            </h1>
          </div>
        </div>
      </div>
    </Link>
  );
}
