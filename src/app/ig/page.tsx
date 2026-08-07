import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import Image from "next/image";
import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import type { Article } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

// Link-in-Bio-Landeseite für Instagram (Betreiber-Freigabe 07.08.2026):
// In der Instagram-Bio steht republicofpixels.com/ig — wer nach einem Post
// "Link in Bio" antippt, findet hier die Artikel der letzten Posts als
// antippbare Karten, den neuesten zuoberst. Die Liste pflegt sich selbst:
// Das Instagram-Autoposting (pipeline/instagram.mjs) vermerkt jeden Post in
// pipeline/state.json, und jeder Pipeline-Lauf baut die Seite neu.
// Bewusst noindex: Die Seite ist ein Werkzeug für Instagram-Besucher, kein
// Suchmaschinen-Inhalt (wäre Duplikat der Startseite).

export const metadata: Metadata = {
  title: "Aus unseren Instagram-Posts",
  description:
    "Die Artikel hinter den Instagram-Posts von Republic of Pixels — ein Tipp genügt.",
  robots: { index: false, follow: true },
};

function instagramArticles(): { articles: Article[]; ausInstagram: boolean } {
  // Nur die posted-Zuordnung lesen — state.json enthält auch Pipeline-Interna
  // (u. a. Zugriffsdaten), die nie in Seiten-Props landen dürfen.
  let posted: Record<string, string> = {};
  try {
    const state = JSON.parse(
      readFileSync(join(process.cwd(), "pipeline", "state.json"), "utf8")
    );
    posted = state.instagram?.posted ?? {};
  } catch {
    // kein State (z. B. lokale Vorschau) → Fallback unten
  }

  const vonInstagram = Object.entries(posted)
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([slug]) => getArticleBySlug(slug))
    .filter((a): a is Article => Boolean(a))
    .slice(0, 6);

  if (vonInstagram.length > 0) return { articles: vonInstagram, ausInstagram: true };
  // Solange noch nichts gepostet wurde: die neuesten Artikel zeigen.
  return { articles: getAllArticles().slice(0, 4), ausInstagram: false };
}

function kicker(article: Article): string {
  if (article.category === "breaking") return "Breaking";
  if (article.category === "reviews") return "Review";
  return article.tags?.[0] ?? "News";
}

export default function InstagramLandingPage() {
  const { articles, ausInstagram } = instagramArticles();

  return (
    <div className="mx-auto max-w-md px-4 pb-16 pt-10">
      <header className="text-center">
        <Image
          src="/brand/r-avatar.png"
          alt="Republic of Pixels"
          width={56}
          height={56}
          className="mx-auto rounded-2xl"
          priority
        />
        <h1 className="mt-3 text-xl font-black tracking-tight text-text-primary">
          Republic of <span className="text-accent">Pixels</span>
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-text-tertiary">
          Du kommst von Instagram? Hier sind die Artikel aus unseren Posts —
          ein Tipp genügt.
        </p>
      </header>

      <Link
        href="/"
        className="mt-5 block rounded-xl bg-accent py-3 text-center text-sm font-extrabold text-bg-base transition-opacity hover:opacity-90"
      >
        Zur Startseite mit allen News
      </Link>

      <h2 className="mb-3 mt-7 text-xs font-bold uppercase tracking-widest text-text-tertiary">
        {ausInstagram ? "Aus unseren Instagram-Posts" : "Unsere neuesten Artikel"}
      </h2>

      <div className="space-y-2.5">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-card p-2.5 transition-colors hover:bg-surface-hover"
          >
            {a.image?.src && (
              <Image
                src={a.image.src}
                alt={a.image.alt ?? a.title}
                width={96}
                height={60}
                className="h-[60px] w-24 shrink-0 rounded-xl object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-accent">
                {kicker(a)}
              </p>
              <h3 className="mt-0.5 text-[13.5px] font-bold leading-snug text-text-primary">
                {a.title}
              </h3>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {formatDateTime(a.publishedAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
