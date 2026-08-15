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
          <div className="absolute bottom-6 left-0 max-w-[88%] sm:bottom-9">
            {/* Zeilenstreifen, die NAHTLOS aneinanderstossen (Tim, 15.08.):
                Der Balken endet mit dem Text, die Flaeche bleibt durchgehend.
                Inter malt den Inline-Hintergrund exakt 1.21em hoch; mit
                0.18em Innenabstand pro Zeile ergibt das 1.57em — die
                Zeilenhoehe ist exakt darauf gesetzt, kein Spalt, keine
                Ueberlappung. */}
            <h1 className="inline bg-[#0C0B1A] px-4 py-[0.18em] text-[22px]/[1.57] font-black tracking-[-0.01em] text-white [box-decoration-break:clone] [-webkit-box-decoration-break:clone] sm:px-5 sm:text-3xl/[1.57] lg:text-[36px]/[1.57]">
              {headline}
            </h1>
          </div>
        </div>
      </div>
    </Link>
  );
}
