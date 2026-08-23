import Link from "next/link";
import type { Article } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import { PlaceholderArt } from "@/components/PlaceholderArt";

// Gemeinsame Bausteine des neuen Designs (Tim-Freigabe 22.08.2026).
// Prinzip: Navy als Grund, Glas statt Rahmen, Farbe nur mit Bedeutung -
// der Markenverlauf bleibt den grossen Momenten vorbehalten.

/** Glasfläche: durchscheinend mit feiner heller Kante. */
export const GLAS =
  "bg-white/[0.07] backdrop-blur-[18px] border border-white/[0.14]";

/** Chip auf Bildern - etwas heller, damit er auf hellen Motiven trägt. */
export const CHIP =
  "bg-white/[0.12] backdrop-blur-[14px] border border-white/[0.22]";

/** Schrift im Markenverlauf. Immer mit w-fit, sonst zeigt die Schrift
 *  nur die blasse Mitte des Verlaufs (nachgemessen 22.08.2026). */
export const VERLAUFSTEXT =
  "w-fit bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] bg-clip-text text-transparent";

/** Spielname statt Kategorie (Tim, 22.08.2026): "GTA 6" sagt mehr als
 *  "News" - und "LEAKS" ist erst recht kein Spielname. Reihenfolge:
 *  erstes Schlagwort, sonst das erste tragende Wort des Titels. */
const RUBRIKEN = new Set(["news", "leaks", "reviews", "guides", "breaking", "republic"]);

export function spielName(a: Article): string {
  const tag = a.tags?.find((x) => x && x.length <= 22 && !RUBRIKEN.has(x.toLowerCase()));
  if (tag) return tag.toUpperCase();
  // Aus dem Titel: bis zum ersten Doppelpunkt oder Gedankenstrich
  const kopf = a.title.split(/[:\u2013-]/)[0].trim();
  const worte = kopf.split(/\s+/).slice(0, 3).join(" ");
  return (worte.length > 22 ? worte.slice(0, 22) : worte).toUpperCase();
}

/** Im Entwurf sind ALLE Spielnamen cyan - eine Farbe, ein Signal. */
export function punktFarbe(_a: Article): string {
  return "#02F0D1";
}

export function labelFarbe(_a: Article): string {
  return "#02F0D1";
}

export function KategorieChip({ article, klein = false }: { article: Article; klein?: boolean }) {
  return (
    <span
      // Die Laufweite haengt hinter dem letzten Buchstaben als leerer Raum
      // und schob den Inhalt um 0.4px nach links (gemessen 23.08.2026).
      // Der rechte Innenabstand wird deshalb um genau diese Laufweite
      // gekuerzt - danach sitzt die Schrift exakt mittig.
      className={`${CHIP} inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-[0.08em] text-white ${
        klein
          ? "py-1 pl-2.5 pr-[calc(0.625rem-0.08em)] text-[10px]"
          : "py-1.5 pl-3 pr-[calc(0.75rem-0.08em)] text-[11px]"
      }`}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: punktFarbe(article) }}
      />
      {spielName(article)}
    </span>
  );
}

/** Bildkachel mit Text im Bild - das Grundelement des Mosaiks. */
export function BildKachel({
  article,
  titelKlasse = "text-[17px]",
  hoehe = "h-full",
}: {
  article: Article;
  titelKlasse?: string;
  hoehe?: string;
}) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className={`group relative flex ${hoehe} items-end overflow-hidden rounded-[22px]`}
    >
      {article.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image.src}
          alt={article.image.alt}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0">
          <PlaceholderArt variant={article.heroVariant} />
        </span>
      )}
      <span className="absolute inset-0 bg-[linear-gradient(200deg,rgba(0,0,0,0)_26%,rgba(0,0,0,0.88)_90%)]" />
      <span className="relative flex flex-col items-start gap-2 p-4 sm:p-5">
        <KategorieChip article={article} klein />
        <span
          className={`${titelKlasse} font-bold leading-[1.18] tracking-[-0.012em] text-white`}
        >
          {article.title}
        </span>
      </span>
    </Link>
  );
}

/** Zeile in der Meldungsspalte: Titel plus Spielname. */
export function MeldungsZeile({ article }: { article: Article; erste?: boolean }) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="block py-3"
    >
      <span className="block text-[14.5px] font-semibold leading-[1.32] text-[#F2F8FF]">
        {article.title}
      </span>
      <span
        className="mt-1.5 block text-[10px] font-bold uppercase tracking-[0.08em]"
        style={{ color: labelFarbe(article) }}
      >
        {spielName(article)}
      </span>
    </Link>
  );
}
