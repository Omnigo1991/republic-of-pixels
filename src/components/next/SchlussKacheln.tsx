import { GLAS } from "./Bausteine";

// Abschluss der Startseite wie im Entwurf (Tim, 22.08.2026): links das
// Pixel-Raten in einer Glaskachel, rechts der Newsletter als einzige
// Farbfläche der Seite - beide gleich hoch, ohne eigene Sektionstitel.
export function NewsletterKachel() {
  // Pixel-Raten ist vorerst entfernt (Tim, 22.08.2026) - der Newsletter
  // steht jetzt neben dem Deal-Radar.
  return (
    <div className="flex flex-col justify-center rounded-[26px] bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] px-8 py-[30px]">
      <div className="text-[24px] font-bold leading-[1.15] text-[#0C0B1A]">
        Keine Nebenquests.
        <br />
        Nur die besten News.
      </div>
      <p className="mt-2 text-[14.5px] text-[#0C0B1A]">Täglich das Wichtigste in deinem Postfach.</p>
      <div className="mt-4">
        <a
          href="https://www.instagram.com/republicofpixels/"
          className="inline-block rounded-full bg-[#0C0B1A] px-5 py-2.5 text-[14px] font-semibold text-white"
        >
          Abonnieren
        </a>
      </div>
    </div>
  );
}
