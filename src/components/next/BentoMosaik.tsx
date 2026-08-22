import Link from "next/link";
import type { Article } from "@/lib/types";
import { GLAS, VERLAUFSTEXT, BildKachel, MeldungsZeile } from "./Bausteine";

// Bento-Mosaik (Tim-Freigabe 22.08.2026): 14 Bildkacheln in bewegter
// Anordnung - gross oben links, hoch rechts, breit unten - dazu rechts
// eine senkrechte Glasspalte mit weiteren Schlagzeilen.
//
// Die Plätze stehen als grid-area (Zeile/Spalte-Start/Ende) fest. Ab
// 900 px bricht alles in EINE Spalte um: bei zwei Spalten waren die
// Kacheln so schmal, dass der Titel das Bild verdeckte (Tim, 22.08.).
const PLAETZE: { bereich: string; titel: string }[] = [
  { bereich: "1/1/3/5", titel: "text-[22px] sm:text-[30px]" },
  { bereich: "1/5/2/7", titel: "text-[17px]" },
  { bereich: "2/5/3/7", titel: "text-[17px]" },
  { bereich: "3/1/4/3", titel: "text-[17px]" },
  { bereich: "3/3/4/5", titel: "text-[17px]" },
  { bereich: "4/1/5/3", titel: "text-[17px]" },
  { bereich: "4/3/5/5", titel: "text-[17px]" },
  { bereich: "5/1/6/3", titel: "text-[17px]" },
  { bereich: "5/3/6/5", titel: "text-[17px]" },
  { bereich: "6/1/7/3", titel: "text-[17px]" },
  { bereich: "6/3/7/5", titel: "text-[17px]" },
  { bereich: "7/1/8/3", titel: "text-[17px]" },
  { bereich: "7/3/8/5", titel: "text-[17px]" },
  { bereich: "7/5/8/7", titel: "text-[17px]" },
];

export function BentoMosaik({
  kacheln,
  meldungen,
}: {
  kacheln: Article[];
  meldungen: Article[];
}) {
  return (
    <div className="schrift-normal mx-auto max-w-content px-4 pt-16 sm:px-6 sm:pt-[72px] lg:px-8">
      <h2 className="text-center text-[30px] font-bold sm:text-[42px] lg:text-[56px]">
        <span className={`${VERLAUFSTEXT} mx-auto`}>Alles. Auf einen Blick.</span>
      </h2>
      <p className="mx-auto mt-2.5 max-w-[560px] text-center text-[16px] text-[#a1a1a6] sm:text-[19px]">
        Das Neueste aus der Republic - kuratiert, geprüft, ohne Clickbait.
      </p>

      <div className="bento mt-8 grid gap-4 sm:mt-10">
        {kacheln.slice(0, PLAETZE.length).map((a, i) => (
          <div key={a.slug} style={{ gridArea: PLAETZE[i].bereich }} className="grid">
            <BildKachel article={a} titelKlasse={PLAETZE[i].titel} />
          </div>
        ))}

        {meldungen.length > 0 && (
          <div
            style={{ gridArea: "3/5/7/7" }}
            className={`spalte ${GLAS} flex flex-col rounded-[22px] px-5 pb-4 pt-1.5`}
          >
            <div className="px-0 pb-0.5 pt-4 text-[11px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
              Weitere Meldungen
            </div>
            <div className="overflow-hidden">
              {meldungen.map((a, i) => (
                <MeldungsZeile key={a.slug} article={a} erste={i === 0} />
              ))}
            </div>
            <div className="mt-auto pt-4">
              <Link
                href="/#news"
                className={`${GLAS} block rounded-full py-2.5 text-center text-[14px] font-semibold text-[#F2F8FF]`}
              >
                Alle News
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
