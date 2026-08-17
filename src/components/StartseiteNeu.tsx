import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { splitTitle } from "@/lib/format";

// Bausteine der neuen hellen Startseite (Hell-Umbau 15.08.2026,
// abgenommener Polygon-Entwurf mit Pixel-Treppe). Alles Serverkomponenten —
// reine Darstellung, Daten kommen aus page.tsx.

// "VOR 2 STUNDEN" — die Zeitform der Neueste-Spalte. Ab 24 Stunden wird
// daraus ein Datum, damit nie "VOR 37 STUNDEN" dasteht.
export function relativeZeit(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const stunden = Math.floor(diffMs / 3600000);
  if (stunden < 1) return "GERADE EBEN";
  if (stunden === 1) return "VOR 1 STUNDE";
  if (stunden < 24) return `VOR ${stunden} STUNDEN`;
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", { day: "numeric", month: "long" }).toUpperCase();
}

export function NeuesteRail({ articles }: { articles: Article[] }) {
  return (
    <aside aria-label="Neueste Meldungen">
      <h2 className="mb-2 text-[24px] font-black tracking-tight text-text-primary sm:text-[28px]">Neueste</h2>
      <div>
        {articles.map((a, i) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className={`group grid grid-cols-[1fr_118px] gap-4 border-b border-border-subtle py-4 last:border-b-0 ${
              i > 2 ? "hidden lg:grid" : ""
            }`}
          >
            <div>
              <p className="mb-1.5 text-[12.5px] font-extrabold tracking-[0.06em] text-accent">
                {relativeZeit(a.publishedAt)}
              </p>
              <h3 className="text-[17px] font-extrabold leading-[1.32] text-text-primary group-hover:text-accent transition-colors">
                {a.title}
              </h3>
            </div>
            <div className="relative h-[76px] w-[118px] overflow-hidden rounded-lg">
              <ArticleMedia article={a} sizes="118px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

// Bildkarte mit Pixel-Treppe oben rechts: Artwork oben KOMPLETT
// unangetastet (Tim, 15.08.2026: "gar nicht abdunkeln"), Beschriftung auf
// eigener Navy-Zone darunter — die Standardkarte des neuen Looks.
export function NotchKarte({
  article,
  bildHoehe = "h-[280px]",
}: {
  article: Article;
  bildHoehe?: string;
}) {
  const { kicker, headline } = splitTitle(article.title, article.tags);
  return (
    <Link href={`/artikel/${article.slug}`} className="group block h-full">
      <div className="treppe-tr h-full">
        <div className={`treppe-innen ${bildHoehe}`}>
          <div className="absolute inset-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover transition-transform duration-500 group-hover:scale-[1.03]">
            <ArticleMedia article={article} sizes="(max-width: 640px) 100vw, 320px" className="h-full w-full" />
          </div>
          {/* Polygon-Scrim (aus deren CSS): nur auf der Textbox, untere
              Haelfte flach 80%, obere Haelfte laeuft aus. */}
          <div
            className="absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-[76px]"
            style={{ background: "linear-gradient(0deg, #0F0E20 0px, #0F0E20 calc(100% - 76px), rgba(15,14,32,0.9) calc(100% - 64px), rgba(15,14,32,0.68) calc(100% - 48px), rgba(15,14,32,0.4) calc(100% - 32px), rgba(15,14,32,0.16) calc(100% - 16px), rgba(15,14,32,0) 100%)" }}
          >
            {kicker && (
              <p className="mb-1 text-[11px] font-extrabold tracking-[0.08em] text-accent line-clamp-1">
                {kicker.toUpperCase()}
              </p>
            )}
            <h3 className="min-h-[2.6em] text-[16px] font-extrabold leading-[1.35] text-white line-clamp-2">{headline}</h3>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Cyan-Band mit den zwei wichtigsten Schlagzeilen — volle Breite.
export function TickerBand({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="bg-accent">
      <div className="mx-auto grid max-w-content items-center gap-4 px-4 py-7 sm:px-6 lg:grid-cols-[200px_1fr_1fr] lg:gap-9 lg:px-8">
        <p className="text-[15px] font-black tracking-[0.12em] text-[#0F0D2C]">AUS DER REPUBLIC</p>
        {articles.slice(0, 2).map((a, i) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className={`text-[19px] font-black uppercase leading-[1.3] text-[#0F0D2C] hover:opacity-70 transition-opacity ${
              i === 1 ? "border-t-[3px] border-[#0F0D2C]/35 pt-4 lg:border-l-[3px] lg:border-t-0 lg:pl-9 lg:pt-0" : ""
            }`}
          >
            {a.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Cyan-Block (Navy-Umbau, Tim 17.08.2026 — vorher Navy, das ginge auf
// Navy-Grund unter). Der Versand existiert noch nicht — das Feld ist
// bewusst stillgelegt und sagt das ehrlich, statt Adressen ins Leere zu
// sammeln.
export function NewsletterBlock({ artikelBilder }: { artikelBilder: Article[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-accent">
      <div className="grid items-center gap-10 px-5 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1fr_400px] lg:px-14 lg:py-14">
        <div>
          <h2 className="text-[28px] font-black leading-[1.15] text-navy/70 sm:text-[40px]">
            {/* Hervorhebung durch volles Navy statt Weiss: Weiss auf Cyan
                misst 1.46:1 und ist damit nicht lesbar. */}
            <span className="text-navy">KEINE NEBENQUESTS.</span>
            <br />
            NUR DIE BESTEN NEWS IN DEIN POSTFACH.
          </h2>
          <p className="mb-6 mt-4 text-[15.5px] text-navy/75 sm:text-[17px]">
            Bleib auf dem Laufenden — Gaming-News, eingeordnet statt nur gemeldet.
          </p>
          <div className="flex max-w-[520px] flex-col gap-3 sm:flex-row">
            <input
              placeholder="Newsletter startet bald"
              disabled
              className="min-w-0 flex-1 rounded-full border-2 border-navy/25 bg-white/70 px-5 py-3.5 text-[15px] text-navy placeholder:text-navy/50"
            />
            <button
              disabled
              className="cursor-not-allowed rounded-full bg-navy px-7 py-3.5 text-[15px] font-extrabold text-accent opacity-70"
            >
              Anmelden
            </button>
          </div>
          <p className="mt-3 text-xs text-navy/65">
            Wir bauen gerade den Versand — bis dahin:{" "}
            <a
              href="https://www.instagram.com/republicofpixels"
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-navy underline decoration-navy/40 underline-offset-4"
            >
              @republicofpixels auf Instagram
            </a>
          </p>
        </div>
        {/* Zwei Sticker mit Pixel-Treppen-Rahmen (Fassung vor der
            Polygon-Collage — Tim, 16.08.2026). */}
        <div className="relative hidden h-[300px] lg:block" aria-hidden="true">
          {artikelBilder[0] && (
            <div className="treppe-tr absolute left-0 top-0 h-[250px] w-[250px] -rotate-[5deg]">
              <div className="treppe-innen h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                <ArticleMedia article={artikelBilder[0]} sizes="500px" className="h-full w-full" />
              </div>
            </div>
          )}
          {artikelBilder[1] && (
            <div className="treppe-tl absolute bottom-0 right-0 h-[250px] w-[250px] rotate-[4deg]">
              <div className="treppe-innen h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover">
                <ArticleMedia article={artikelBilder[1]} sizes="500px" className="h-full w-full" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sektions-Kopf im neuen Look: fette Überschrift + MEHR-Pfeil + Hinweis.
export function SektionsKopf({
  titel,
  hinweis,
}: {
  titel: string;
  hinweis?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
      <h2 className="text-[24px] font-black tracking-tight text-text-primary sm:text-[28px]">{titel}</h2>
      {hinweis && <span className="ml-auto text-[13px] text-text-secondary">{hinweis}</span>}
    </div>
  );
}

// "Mehr anzeigen" als Pille unter der Sektion — EIN Muster fuer alle
// Sektionen (Tim, 15.08.2026): kein Mini-Link mehr neben der Ueberschrift.
export function MehrPille({ href, text = "Mehr anzeigen" }: { href: string; text?: string }) {
  return (
    <div className="mt-8 flex justify-center">
      <Link
        href={href}
        className="rounded-full border border-accent/50 px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
      >
        {text}
      </Link>
    </div>
  );
}
