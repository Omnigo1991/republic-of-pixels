import Image from "next/image";
import type { Article } from "@/lib/types";
import { PlaceholderArt } from "./PlaceholderArt";

// Einheitliche Bilddarstellung: echtes Artikelbild (next/image, von Vercel
// on-demand optimiert), sonst PlaceholderArt. Der umgebende Container muss
// `relative` mit festem Seitenverhältnis sein — wie bei allen bisherigen
// PlaceholderArt-Einsätzen.
export function ArticleMedia({
  article,
  className,
  sizes,
  priority = false,
}: {
  article: Article;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (article.image?.src) {
    return (
      <Image
        src={article.image.src}
        alt={article.image.alt}
        fill
        sizes={sizes ?? "(max-width: 640px) 100vw, 50vw"}
        priority={priority}
        className={`object-cover ${className ?? ""}`}
      />
    );
  }
  return <PlaceholderArt variant={article.heroVariant} className={className} />;
}
