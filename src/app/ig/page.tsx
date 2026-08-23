import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import Image from "next/image";
import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import type { Article } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { GLAS, spielName } from "@/components/next/Bausteine";

// Link-in-Bio-Landeseite für Instagram (Betreiber-Freigabe 07.08.2026):
// In der Instagram-Bio steht republicofpixels.com/ig - wer nach einem Post
// "Link in Bio" antippt, findet hier die Artikel der letzten Posts als
// antippbare Karten, den neuesten zuoberst. Die Liste pflegt sich selbst:
// Das Instagram-Autoposting (pipeline/instagram.mjs) vermerkt jeden Post in
// pipeline/state.json, und jeder Pipeline-Lauf baut die Seite neu.
// Bewusst noindex: Die Seite ist ein Werkzeug für Instagram-Besucher, kein
// Suchmaschinen-Inhalt (wäre Duplikat der Startseite).

export const metadata: Metadata = {
  title: "Aus unseren Instagram-Posts",
  description:
    "Die Artikel hinter den Instagram-Posts von Republic of Pixels - ein Klick genügt.",
  robots: { index: false, follow: true },
};

function instagramArticles(): { articles: Article[]; ausInstagram: boolean } {
  // Nur die posted-Zuordnung lesen - state.json enthält auch Pipeline-Interna
  // (u. a. Zugriffsdaten), die nie in Seiten-Props landen dürfen.
  let posted: Record<string, string> = {};
  let unlisted: string[] = [];
  try {
    const state = JSON.parse(
      readFileSync(join(process.cwd(), "pipeline", "state.json"), "utf8")
    );
    posted = state.instagram?.posted ?? {};
    // unlisted: Posts, die Tim auf Instagram gelöscht hat - sie bleiben im
    // posted-Gedächtnis (verhindert erneutes Posten), erscheinen aber nicht
    // mehr auf dieser Seite.
    unlisted = state.instagram?.unlisted ?? [];
  } catch {
    // kein State (z. B. lokale Vorschau) → Fallback unten
  }

  const vonInstagram = Object.entries(posted)
    .filter(([slug]) => !unlisted.includes(slug))
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([slug]) => getArticleBySlug(slug))
    .filter((a): a is Article => Boolean(a))
    .slice(0, 6);

  if (vonInstagram.length > 0) return { articles: vonInstagram, ausInstagram: true };
  // Solange noch nichts gepostet wurde: die neuesten Artikel zeigen.
  return { articles: getAllArticles().slice(0, 4), ausInstagram: false };
}

export default function InstagramLandingPage() {
  const { articles, ausInstagram } = instagramArticles();

  return (
    <div className="schrift-normal mx-auto max-w-md px-4 pb-20 pt-12">
      {/* Wortmarke wie in der Kopfleiste, nur doppelt so gross: Zeichen
          links, "REPUBLIC" über "OF PIXELS" (Tim, 23.08.2026). Vorher
          stand hier die alte einzeilige Fassung in schwarzer Schrift. */}
      <header className="text-center">
        <Link
          href="/"
          aria-label="Republic of Pixels - Startseite"
          className="inline-flex items-center gap-5"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/r-mark.png" alt="" aria-hidden="true" className="h-[52px] w-auto" />
          <span className="text-left leading-[1.05]">
            <span className="block text-[26px] font-bold tracking-[-0.015em] text-[#F2F8FF]">
              REPUBLIC
            </span>
            <span className="mt-[3px] block text-[15px] font-bold tracking-[0.2em] text-accent">
              OF PIXELS
            </span>
          </span>
        </Link>
        <p className="mt-5 text-[15px] leading-[1.5] text-[#a1a1a6]">
          Du kommst von Instagram? Hier sind die Artikel aus unseren Posts -
          ein Klick genügt.
        </p>
      </header>

      {/* Einzige Farbfläche der Seite, im Standardverlauf wie die
          Newsletter-Kachel der Startseite. */}
      <Link
        href="/"
        className="mt-7 block rounded-full bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] py-3.5 text-center text-[15px] font-bold text-[#0C0B1A]"
      >
        Zur Startseite mit allen News
      </Link>

      <h2 className="mb-4 mt-10 text-[20px] font-bold text-[#F2F8FF]">
        {ausInstagram ? "Aus unseren Instagram-Posts" : "Unsere neuesten Artikel"}
      </h2>

      <div className="flex flex-col gap-3">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className={`${GLAS} flex items-center gap-3.5 rounded-[18px] p-3`}
          >
            {a.image?.src && (
              <Image
                src={a.image.src}
                alt={a.image.alt ?? a.title}
                width={100}
                height={66}
                className="h-[66px] w-[100px] shrink-0 rounded-[12px] object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.07em] text-accent">
                {spielName(a)}
              </p>
              <h3 className="mt-1.5 text-[14px] font-semibold leading-[1.3] text-[#F2F8FF]">
                {a.title}
              </h3>
              <p className="mt-1.5 text-[11.5px] text-[#86868b]">
                {formatDateTime(a.publishedAt)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
