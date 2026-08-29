import Link from "next/link";
import { getChronological } from "@/lib/articles";
import { KategorieChip } from "@/components/next/Bausteine";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import type { Article } from "@/lib/types";

// NUR VORSCHAU (Tim, 29.08.2026: "Screenshot davon, wie wir die Zeitangabe
// bei den Artikeln auf der Startseite erwähnen könnten").
//
// Anlass steht im Leserbericht von heute: Auf der ganzen Startseite steht bei
// keinem einzigen Artikel, wann er erschienen ist. Bei einer Nachrichtenseite
// ist das die erste Frage überhaupt - ohne Datum wirkt jede Meldung wie eine
// Konserve. Auf der Artikelseite selbst steht die Zeit längst.
//
// Diese Datei wird nach der Entscheidung wieder gelöscht. Nicht verlinkt,
// noindex.

export const metadata = { robots: { index: false, follow: false } };

/**
 * "vor 2 Std." statt "29.08.2026, 07:41".
 *
 * Bei Nachrichten trägt der Abstand die Information, nicht der Zeitpunkt.
 * "vor 2 Std." beantwortet die Frage "ist das noch aktuell?" sofort, ein
 * Datum verlangt Kopfrechnen. Ab drei Tagen kippt es auf das Datum, weil
 * "vor 96 Stunden" niemandem hilft.
 */
function seit(iso: string, jetzt: number): string {
  const min = Math.floor((jetzt - new Date(iso).getTime()) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const std = Math.floor(min / 60);
  if (std < 24) return `vor ${std} Std.`;
  const tage = Math.floor(std / 24);
  if (tage === 1) return "gestern";
  if (tage < 3) return `vor ${tage} Tagen`;
  return new Date(iso).toLocaleDateString("de-CH", { day: "2-digit", month: "short" });
}

/** Frisch = in den letzten sechs Stunden. Dann lohnt ein Signal. */
const istFrisch = (iso: string, jetzt: number) => jetzt - new Date(iso).getTime() < 6 * 3600000;

type Fassung = "ohne" | "beimChip" | "unterTitel" | "ecke" | "nurFrisch";

function Kachel({
  article,
  fassung,
  jetzt,
}: {
  article: Article;
  fassung: Fassung;
  jetzt: number;
}) {
  const zeit = seit(article.publishedAt, jetzt);
  const frisch = istFrisch(article.publishedAt, jetzt);
  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="group relative flex h-[212px] items-end overflow-hidden rounded-[22px]"
    >
      {article.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span className="absolute inset-0">
          <PlaceholderArt variant={article.heroVariant} />
        </span>
      )}
      <span className="absolute inset-0 bg-[linear-gradient(200deg,rgba(0,0,0,0)_26%,rgba(0,0,0,0.88)_90%)]" />

      {/* C: Pille oben rechts, ausserhalb des Textblocks */}
      {fassung === "ecke" && (
        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-[6px]">
          {zeit}
        </span>
      )}

      <span className="relative flex flex-col items-start gap-2 p-4 sm:p-5">
        <span className="flex flex-wrap items-center gap-2">
          <KategorieChip article={article} klein />

          {/* A: direkt neben der Rubrik */}
          {fassung === "beimChip" && (
            <span className="text-[11px] font-semibold text-white/70">{zeit}</span>
          )}

          {/* D: nur wenn wirklich frisch, mit Cyan-Punkt */}
          {fassung === "nurFrisch" && frisch && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {zeit}
            </span>
          )}
        </span>

        <span className="text-[17px] font-bold leading-[1.18] tracking-[-0.012em] text-white">
          {article.title}
        </span>

        {/* B: unter der Schlagzeile */}
        {fassung === "unterTitel" && (
          <span className="text-[12px] font-medium text-white/60">{zeit}</span>
        )}
      </span>
    </Link>
  );
}

const FASSUNGEN: { key: Fassung; titel: string; erklaerung: string }[] = [
  { key: "ohne", titel: "Heute", erklaerung: "Keine Zeitangabe. Man weiss nicht, ob das von heute Morgen oder von letzter Woche ist." },
  { key: "beimChip", titel: "A · neben der Rubrik", erklaerung: "Zurückhaltend, liest sich wie eine Zeile: Rubrik, dann Alter." },
  { key: "unterTitel", titel: "B · unter der Schlagzeile", erklaerung: "Trennt Thema und Zeit klar, braucht aber eine dritte Zeile." },
  { key: "ecke", titel: "C · Pille oben rechts", erklaerung: "Immer an derselben Stelle, auch bei langen Schlagzeilen. Legt sich aber übers Bild." },
  { key: "nurFrisch", titel: "D · nur wenn frisch", erklaerung: "Cyan-Punkt nur bei Artikeln der letzten sechs Stunden. Ruhig, aber ältere Kacheln bleiben ohne Angabe." },
];

export default function VorschauZeit() {
  const jetzt = Date.now();
  const artikel = getChronological().slice(0, 4);

  return (
    <main className="mx-auto max-w-[1180px] px-4 py-12">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-accent">
        Vorschau, nicht verlinkt
      </p>
      <h1 className="mb-3 text-[30px] font-bold text-white sm:text-[38px]">
        Wann ist das erschienen?
      </h1>
      <p className="mb-4 max-w-[66ch] text-[16px] leading-relaxed text-[#a1a1a6]">
        Vier Fassungen mit echten Artikeln von der Startseite. Alles andere ist
        unverändert: gleiche Kachel, gleiche Masse, gleicher Verlauf.
      </p>
      <p className="mb-10 max-w-[66ch] text-[15px] leading-relaxed text-[#86868b]">
        Ich zeige bewusst „vor 2 Std." statt „29.08.2026, 07:41". Bei
        Nachrichten trägt der Abstand die Information: Er beantwortet sofort, ob
        etwas noch aktuell ist. Ein Datum verlangt Kopfrechnen. Ab drei Tagen
        kippt die Anzeige aufs Datum, weil „vor 96 Stunden" niemandem hilft.
      </p>

      {FASSUNGEN.map((f) => (
        <section key={f.key} className="mb-12">
          <p className="mb-1 text-[13px] font-semibold uppercase tracking-wider text-accent">
            {f.titel}
          </p>
          <p className="mb-4 max-w-[70ch] text-[14.5px] text-[#a1a1a6]">{f.erklaerung}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {artikel.map((a) => (
              <Kachel key={a.slug} article={a} fassung={f.key} jetzt={jetzt} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
