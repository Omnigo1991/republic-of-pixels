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

/** Spielname statt Kategorie: "GTA 6" sagt mehr als "News". */
export function spielName(a: Article): string {
  const t = a.tags?.[0];
  if (t && t.length <= 22) return t.toUpperCase();
  return CATEGORY_LABELS[a.category].toUpperCase();
}

/** Leaks tragen Magenta, alles andere Cyan - für Punkte und Flächen. */
export function punktFarbe(a: Article): string {
  return a.category === "leaks" || a.isLeakOrRumor ? "#FF2E97" : "#02F0D1";
}

/** Dieselbe Unterscheidung für SCHRIFT: Das satte Magenta erreicht auf
 *  Navy nur 4,19:1 und liegt damit unter der Lesbarkeitsnorm für kleine
 *  Schrift (gemessen 22.08.2026). Der hellere Ton der Markenfamilie
 *  schafft 6,4:1 - der Punkt daneben bleibt satt. */
export function labelFarbe(a: Article): string {
  return a.category === "leaks" || a.isLeakOrRumor ? "#FF6BC0" : "#02F0D1";
}

export function KategorieChip({ article, klein = false }: { article: Article; klein?: boolean }) {
  return (
    <span
      className={`${CHIP} inline-flex items-center gap-1.5 rounded-full font-bold uppercase tracking-[0.08em] text-white ${
        klein ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"
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
export function MeldungsZeile({ article, erste }: { article: Article; erste: boolean }) {
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className={`block py-3.5 ${erste ? "" : "border-t border-white/10"}`}
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
