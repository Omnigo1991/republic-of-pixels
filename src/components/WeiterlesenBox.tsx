import type { Article } from "@/lib/types";
import { BildKachel } from "./next/Bausteine";

// LESE-ANSCHLUSS NACH DEN QUELLEN, noch vor dem Kommentarbereich -
// erreicht auch Leser:innen, die nicht bis zum Seitenende scrollen.
//
// 1:1 DIE STARTSEITEN-KACHEL (Tim, 25.08.2026). Vorher standen hier zwei
// breite Zeilen mit kleinem Vorschaubild - die Optik von vor dem
// Rebranding, die neben der neuen Startseite nach zwei Marken aussah.
//
// "1:1" heisst mehr als dieselbe Komponente: auch dieselben Masse. Das
// Mosaik der Startseite steht auf einem Raster mit 212 px hohen Zeilen und
// 16 px Abstand (.bento in globals.css), die Schlagzeile laeuft dort in
// text-[17px]. Genau das gilt hier. Wer die Kachelhoehe der Startseite
// aendert, muss diese Datei mitnehmen - darum steht die Zahl hier mit
// derselben Begruendung.
//
// Der Umbruch bei 900 px ist ebenfalls von dort uebernommen: Zwei Kacheln
// nebeneinander waeren auf dem Handy so schmal, dass die Schlagzeile das
// halbe Motiv verdeckt - genau der Fehler, den Tim am 22.08. im Mosaik
// gefunden hat. Unterhalb also untereinander.
//
// Dort MINDESThoehe statt fester Hoehe, wieder wie im Mosaik: Eine lange
// Schlagzeile darf die Kachel wachsen lassen, statt aus ihr zu laufen.
const KACHEL_HOEHE =
  "h-[212px] w-full max-[900px]:h-auto max-[900px]:min-h-[264px]";

export function WeiterlesenBox({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="not-prose my-8">
      <p className="mb-3 text-[13px] font-semibold tracking-wide text-accent">WEITERLESEN</p>
      <div className="grid grid-cols-1 gap-4 min-[901px]:grid-cols-2">
        {articles.slice(0, 2).map((a) => (
          <BildKachel key={a.slug} article={a} hoehe={KACHEL_HOEHE} titelKlasse="text-[17px]" />
        ))}
      </div>
    </div>
  );
}

export { KACHEL_HOEHE };
