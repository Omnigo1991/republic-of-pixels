import Link from "next/link";
import { CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";
import { MobileNav } from "./MobileNav";
import { SearchTrigger } from "./SearchOverlay";
import { PlatformIcon } from "./PlatformIcons";
import { BreakingTicker } from "./BreakingTicker";

// Verge-inspiriertes Cyan-Masthead (Betreiber-Entscheidung 05.08.2026).
// Drei Varianten:
//   "brand"   — Startseite: grosses Navy-R allein als Marken-Statement
//   "section" — Kategorie-Seiten: R + grosses Sektionswort
//   "slim"    — Artikel & Unterseiten: nur die Navigationszeile auf Cyan
// Wasserzeichen "Republic of Pixels" Ton-in-Ton, auf allen Viewports identisch
// (oben angeschnitten) — bewusster Wiedererkennungswert.
export function Masthead({
  variant = "slim",
  word,
}: {
  variant?: "brand" | "section" | "slim";
  word?: string;
}) {
  return (
    <>
      <div className="relative overflow-hidden bg-accent-brand text-[#0F0D2C]">
        {/* Wasserzeichen ganz oben, an der Oberkante angeschnitten (Verge-Stil) —
            explizite Betreiber-Vorgabe 05.08.2026: genau so, nicht mittig. */}
        {variant !== "slim" && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap font-black tracking-tighter text-[#02C5AB] select-none sm:-top-10"
            style={{ fontSize: "min(13vw, 190px)", lineHeight: 0.9 }}
          >
            Republic of Pixels
          </div>
        )}

        {/* Navigationszeile */}
        <div className="relative mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6 lg:justify-center lg:gap-2 lg:px-8">
          <Link href="/" aria-label="Republic of Pixels – Startseite" className="flex items-center gap-2">
            {/* R nur im schlanken Band — auf brand/section steht es gross darunter
                und wäre in der Navigationszeile doppelt (Betreiber-Vorgabe). */}
            {variant === "slim" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/brand/r-mark-navy.png" alt="" aria-hidden="true" className="h-7 w-auto" />
            )}
            {/* leading-none + 1px-Nudge: Versalien haben keine Unterlängen und
                sässen sonst optisch zu hoch gegenüber den Menüpunkten. */}
            <span className="text-[15px] font-black leading-none tracking-tight translate-y-[1px] sm:text-[17px]">
              REPUBLIC<span className="opacity-60"> OF PIXELS</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center text-[14px] font-semibold" aria-label="Kategorien">
            <span className="mx-2 opacity-40">/</span>
            {CATEGORY_NAV.map((c, i) => (
              <span key={c.key} className="flex items-center">
                {i > 0 && <span className="mx-2 opacity-40">/</span>}
                <Link href={`/kategorie/${c.key}`} className="hover:opacity-70 transition-opacity">
                  {c.label}
                </Link>
              </span>
            ))}
            <span className="mx-2 opacity-40">/</span>
          </nav>

          <nav className="hidden lg:flex items-center gap-3" aria-label="Plattformen">
            {PLATFORM_NAV.map((p) => (
              <Link
                key={p.key}
                href={`/kategorie/${p.key}`}
                title={p.label}
                aria-label={p.label}
                className="hover:opacity-70 transition-opacity"
              >
                <PlatformIcon platform={p.key} className="h-4 w-4" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center lg:ml-3">
            <span className="hidden lg:block">
              <SearchTrigger />
            </span>
            <MobileNav instagramUrl="https://www.instagram.com/republicofpixels" />
          </div>
        </div>

        {/* Marken- bzw. Sektionsbereich */}
        {/* Mobile deutlich kompakter (R proportional wie auf Desktop), Desktop unverändert. */}
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
    </>
  );
}
