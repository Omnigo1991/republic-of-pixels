import Link from "next/link";
import { GLAS } from "@/components/next/Bausteine";

// NUR VORSCHAU (Tim, 27.08.2026: "Wie würde die Patchnotes Automatik
// aussehen? Visuell auf der Homepage?"). Diese Datei wird nach der
// Entscheidung wieder gelöscht - sie ist nicht verlinkt und steht in keiner
// Navigation.

export const metadata = { robots: { index: false, follow: false } };

const KARTE = `${GLAS} rounded-[22px] p-6 sm:p-7`;

function Kopf({ titel, rechts }: { titel: string; rechts?: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="text-[19px] font-bold text-[#F2F8FF] sm:text-[21px]">{titel}</div>
      {rechts && <div className="hidden text-[12px] text-[#86868b] sm:block">{rechts}</div>}
    </div>
  );
}

const PATCHES = [
  { spiel: "World of Warcraft", patch: "12.1.5", datum: "26. Aug", was: "Balance für alle Klassen, Ula'tek-Raid offen", frisch: true },
  { spiel: "Helldivers 2", patch: "01.003.400", datum: "26. Aug", was: "Vier Waffen überarbeitet, neues Stratagem", frisch: true },
  { spiel: "Diablo 4", patch: "2.4.1", datum: "25. Aug", was: "Uniques angepasst, Höllenflut häufiger", frisch: false },
  { spiel: "Fortnite", patch: "39.10", datum: "25. Aug", was: "Neue Insel im Nordosten, Sturm schneller", frisch: false },
  { spiel: "Destiny 2", patch: "8.2.5", datum: "24. Aug", was: "Exotics neu gewichtet", frisch: false },
  { spiel: "Call of Duty", patch: "Season 5 Reloaded", datum: "23. Aug", was: "Zwei Karten zurück, TTK angepasst", frisch: false },
];

export default function Vorschau() {
  return (
    <main className="mx-auto max-w-[1180px] px-4 py-14">
      <p className="mb-2 text-[13px] font-semibold tracking-wide text-accent">VORSCHAU, NICHT VERLINKT</p>
      <h1 className="mb-3 text-[30px] font-bold text-[#F2F8FF]">Patch-Radar: drei Fassungen</h1>
      <p className="mb-12 max-w-[70ch] text-[16px] leading-relaxed text-[#a1a1a6]">
        Dieselben Daten, drei Grade an Auffälligkeit. Alles in der bestehenden
        Bildsprache der Startseite, also gleiche Glaskarte, gleiche Masse,
        gleiche Farben wie Release- und Deal-Radar.
      </p>

      {/* ---------------- A ---------------- */}
      <p className="mb-3 text-[13px] font-semibold tracking-wide text-accent">FASSUNG A &nbsp;·&nbsp; KOMPAKT, WIE DER RELEASE-RADAR</p>
      <div className="flaechen-glas mb-14">
        <div className={KARTE}>
          <Kopf titel="Patch-Radar" rechts="Was sich gerade in euren Spielen ändert" />
          <div className="grid gap-3 sm:grid-cols-3">
            {PATCHES.slice(0, 3).map((p) => (
              <div key={p.spiel} className="rounded-[16px] bg-white/[0.06] px-4 py-3.5">
                <div className="text-[12px] font-bold text-accent">
                  {p.datum} &nbsp;·&nbsp; {p.patch}
                </div>
                <div className="mt-1.5 text-[13.5px] font-semibold leading-[1.25] text-[#F2F8FF]">
                  {p.spiel}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- B ---------------- */}
      <p className="mb-3 text-[13px] font-semibold tracking-wide text-accent">FASSUNG B &nbsp;·&nbsp; MIT INHALT, WIE DER EVENT-RADAR</p>
      <div className="flaechen-glas mb-14">
        <div className={KARTE}>
          <Kopf titel="Patch-Radar" rechts="Was sich gerade in euren Spielen ändert" />
          <div className="grid gap-3 sm:grid-cols-2">
            {PATCHES.map((p) => (
              <Link
                key={p.spiel}
                href="#"
                // min-w-0 MUSS auch hier stehen, nicht nur am Textblock innen:
                // Ein Raster-Kind hat von sich aus min-width:auto und wird
                // deshalb so breit wie sein Inhalt - die Zeile lief 74 Pixel
                // aus der Glaskarte heraus. Gemessen, nicht geschaetzt: Karte
                // endete bei 374 px, die Zeile bei 448.
                className="flex min-w-0 items-center gap-3.5 rounded-[14px] bg-white/[0.06] px-4 py-3.5"
              >
                <span className="shrink-0 whitespace-nowrap text-[11px] font-extrabold tracking-[0.03em] text-accent">
                  {p.datum}
                </span>
                {/* min-w-0 wirkt nur auf einem Flex-Kind, das auch ein Block
                    ist - als reines Inline-Element bleibt es wirkungslos und
                    die Zeile laeuft aus der Glaskarte heraus (auf dem Handy
                    sofort sichtbar). */}
                <span className="block min-w-0 flex-1">
                  {/* Bewusst OHNE truncate: Auf dem Handy wurde daraus
                      "World of Warcraft 1..." - eine abgeschnittene
                      Patch-Nummer ist wertlos. Lieber zwei Zeilen. */}
                  <span className="block text-[14.5px] font-semibold leading-[1.2] text-[#F2F8FF]">
                    {p.spiel} <span className="text-[#86868b]">{p.patch}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-[#a1a1a6]">{p.was}</span>
                </span>
                {p.frisch && (
                  <span className="ml-auto shrink-0 rounded-full border border-accent/40 bg-accent/[0.16] py-[3px] pl-2.5 pr-[calc(0.625rem-0.06em)] text-[10px] font-bold uppercase tracking-[0.06em] text-accent">
                    Neu
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------- C ---------------- */}
      <p className="mb-3 text-[13px] font-semibold tracking-wide text-accent">FASSUNG C &nbsp;·&nbsp; GAR NICHT AUF DER STARTSEITE</p>
      <div className="flaechen-glas mb-6">
        <div className={`${KARTE} text-center`}>
          <p className="mx-auto max-w-[60ch] text-[15.5px] leading-relaxed text-[#a1a1a6]">
            Die Startseite bleibt exakt wie heute. Die Patchnotes existieren nur
            als Artikelseiten und werden ausschliesslich über die Suche
            gefunden.
          </p>
        </div>
      </div>
    </main>
  );
}
