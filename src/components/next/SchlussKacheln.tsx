import { PixelRaten } from "@/components/PixelRaten";
import { GLAS } from "./Bausteine";

// Abschluss der Startseite wie im Entwurf (Tim, 22.08.2026): links das
// Pixel-Raten in einer Glaskachel, rechts der Newsletter als einzige
// Farbfläche der Seite - beide gleich hoch, ohne eigene Sektionstitel.
export function SchlussKacheln() {
  return (
    <div className="mt-16 grid gap-4 lg:grid-cols-[3fr_2fr]">
      <div className={`${GLAS} raten-kachel overflow-hidden rounded-[22px] p-6 sm:p-7`}>
        <PixelRaten />
      </div>

      <div className="flex flex-col justify-center rounded-[22px] bg-[linear-gradient(120deg,rgba(2,240,209,0.92)_0%,rgba(2,240,209,0.84)_46%,rgba(255,46,151,0.84)_100%)] p-7 sm:p-8">
        <div className="text-[24px] font-bold leading-[1.15] text-[#0C0B1A] sm:text-[26px]">
          Keine Nebenquests.
          <br />
          Nur die besten News.
        </div>
        <p className="mt-2 text-[14.5px] leading-[1.45] text-[#0C0B1A]">
          Täglich das Wichtigste in deinem Postfach.
        </p>
        <form className="mt-4 flex flex-wrap gap-2.5">
          <input
            type="email"
            placeholder="deine@mail.ch"
            aria-label="E-Mail-Adresse"
            className="min-w-0 flex-1 rounded-full border border-[#0C0B1A]/20 bg-white/85 px-4 py-2.5 text-[14px] text-[#0C0B1A] placeholder:text-[#0C0B1A]/55"
          />
          <button
            type="submit"
            className="rounded-full bg-[#0C0B1A] px-5 py-2.5 text-[14px] font-semibold text-white"
          >
            Abonnieren
          </button>
        </form>
        <p className="mt-2.5 text-[12px] text-[#0C0B1A]">Newsletter startet bald - trag dich schon ein.</p>
      </div>
    </div>
  );
}
