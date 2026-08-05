import { MastheadNav } from "./MastheadNav";
import { StickyNav } from "./StickyNav";
import { BreakingTicker } from "./BreakingTicker";

// Verge-inspiriertes Cyan-Masthead (Betreiber-Entscheidung 05.08.2026).
// Drei Varianten:
//   "brand"   — Startseite: grosses Navy-R allein als Marken-Statement
//   "section" — Kategorie-Seiten: R links + Sektionswort rechtsbündig mittig
//   "slim"    — Artikel & Unterseiten: nur die Navigationszeile, STICKY
// brand/section scrollen aus dem Bild; ab ~230px Scroll gleitet die schlanke
// Sticky-Leiste (StickyNav, Artikel-Look) herein. Wasserzeichen oben
// angeschnitten (explizit gewollt), skaliert proportional zum Viewport.
export function Masthead({
  variant = "slim",
  word,
}: {
  variant?: "brand" | "section" | "slim";
  word?: string;
}) {
  if (variant === "slim") {
    return (
      <>
        <div className="sticky top-0 z-50 bg-accent-brand text-[#0F0D2C]">
          <MastheadNav withMark />
        </div>
        <BreakingTicker />
      </>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden bg-accent-brand text-[#0F0D2C]">
        {/* Wasserzeichen ganz oben, an der Oberkante angeschnitten (Verge-Stil). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-black tracking-tighter text-[#02C5AB] select-none sm:-top-10"
          style={{ fontSize: "min(13vw, 190px)", lineHeight: 0.9 }}
        >
          Republic of Pixels
        </div>

        <MastheadNav withMark={false} />

        {/* Mobile kompakt (R proportional wie Desktop), Desktop grosszügig. */}
        {variant === "brand" && (
          <div className="relative mx-auto flex max-w-content items-end px-4 pb-4 pt-2 sm:px-6 sm:pb-12 sm:pt-20 lg:px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-mark-navy.png" alt="Republic of Pixels" className="h-[56px] w-auto sm:h-[128px]" />
          </div>
        )}
        {variant === "section" && (
          <div className="relative mx-auto flex max-w-content items-center justify-between px-4 pb-4 pt-2 sm:px-6 sm:pb-12 sm:pt-20 lg:px-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-mark-navy.png" alt="" aria-hidden="true" className="h-[56px] w-auto sm:h-[128px]" />
            <h1
              className="text-right font-black leading-[0.85] tracking-tighter"
              style={{ fontSize: "clamp(40px, 7vw, 96px)" }}
            >
              {word}
            </h1>
          </div>
        )}
      </div>
      <BreakingTicker />
      <StickyNav />
    </>
  );
}
