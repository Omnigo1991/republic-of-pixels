import { BildKachel } from "./next/Bausteine";
import { KACHEL_HOEHE } from "./WeiterlesenBox";
import type { Article } from "@/lib/types";

// ARTIKELEMPFEHLUNG IM FLIESSTEXT - 1:1 die Startseiten-Kachel
// (Tim, 25.08.2026).
//
// Vorher war das eine breite Zeile mit kleinem Vorschaubild links und
// Kopfzeile, Datum, Lesezeit und Anrisstext rechts - die Optik aus der
// Zeit vor dem Rebranding.
//
// Es ist bewusst DIESELBE Komponente wie im Mosaik (BildKachel) mit
// denselben Massen (siehe KACHEL_HOEHE in WeiterlesenBox) und nicht eine
// nachgebaute Kopie. Genau daraus war der Unterschied ja entstanden: Die
// Startseite wurde am 22.08. umgebaut, diese Stelle nicht.
//
// not-prose ist Pflicht: Im Fliesstext greifen sonst die
// Typografie-Regeln aus globals.css auf Link und Ueberschrift durch.
export function InlineArticleCard({ article }: { article: Article }) {
  return (
    <div className="not-prose">
      <BildKachel article={article} hoehe={KACHEL_HOEHE} titelKlasse="text-[17px]" />
    </div>
  );
}
