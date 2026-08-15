import Link from "next/link";
import { BreakingTicker } from "./BreakingTicker";
import { MobileNav } from "./MobileNav";
import { SearchTrigger } from "./SearchOverlay";
import { PlatformIcon } from "./PlatformIcons";
import { AuthStatus } from "./AuthStatus";
import { PLATFORM_NAV } from "@/lib/articles";

// HELLER HEADER (Tim, 15.08.2026 abends, aus der H3/V-Runde): durchgezogene
// weisse Leiste, grosses Cyan-Logo mit Schriftzug, drei pure Textlinks
// (News / Guides / Radare) mit Sprungzielen auf der Startseite, die
// Plattform-Icons als Chip-Gruppe, Suche, Anmelden als Cyan-Pille und das
// Burger-Menü mit dem kompletten Mobile-Inhalt — auf allen Breiten.

// Header-Staub (W5, Tim-Favorit): wenige Cyan-Pixel wehen durch die
// Leiste — Positionen fest, unter den Bedienelementen (DOM-Reihenfolge),
// nicht anklickbar.
const KOPF_STAUB: { l: number; t: number; g: number; o: number }[] = [
  { l: 46, t: 18, g: 7, o: 0.3 }, { l: 51, t: 62, g: 5, o: 0.2 },
  { l: 56, t: 32, g: 9, o: 0.4 }, { l: 61, t: 74, g: 4, o: 0.18 },
  { l: 66, t: 14, g: 6, o: 0.25 }, { l: 72, t: 52, g: 8, o: 0.35 },
  { l: 78, t: 26, g: 4, o: 0.2 }, { l: 84, t: 68, g: 6, o: 0.28 },
  { l: 90, t: 20, g: 5, o: 0.22 }, { l: 95, t: 56, g: 7, o: 0.3 },
];

export function Masthead({
  variant: _variant = "slim",
  word: _word,
}: {
  variant?: "brand" | "section" | "slim";
  word?: string;
}) {
  return (
    <>
      <div className="sticky top-0 z-50 overflow-hidden border-b border-border-subtle bg-white shadow-[0_10px_30px_-24px_rgba(12,11,26,0.25)]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">
          {KOPF_STAUB.map((p, i) => (
            <span
              key={i}
              className="absolute bg-accent"
              style={{ left: `${p.l}%`, top: `${p.t}%`, width: `${p.g}px`, height: `${p.g}px`, opacity: p.o }}
            />
          ))}
        </div>
        <div className="relative mx-auto flex h-16 max-w-content items-center gap-5 px-4 sm:px-6 lg:h-[88px] lg:gap-7 lg:px-8">
          <Link href="/" aria-label="Republic of Pixels – Startseite" className="mr-auto flex items-center gap-3 lg:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-mark.png" alt="" aria-hidden="true" className="h-9 w-auto lg:h-12" />
            {/* Unter 420px nur "REPUBLIC" — der volle Schriftzug lief sonst
                unter die Anmelden-Pille (Mobil-Fund 15.08.2026). */}
            <span className="translate-y-[1px] whitespace-nowrap text-[17px] font-black leading-none tracking-tight text-text-primary sm:text-[21px] lg:text-[28px]">
              REPUBLIC<span className="hidden text-accent min-[420px]:inline"> OF PIXELS</span>
            </span>
          </Link>

          {/* Pure Textlinks mit Sprungzielen (ohne Pillenbox, Tim-Vorgabe). */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Bereiche">
            <Link href="/#news" className="text-[16.5px] font-bold text-text-primary transition-colors hover:text-accent">
              News
            </Link>
            <Link href="/#guides" className="text-[16.5px] font-bold text-text-primary transition-colors hover:text-accent">
              Guides
            </Link>
            <Link href="/#radare" className="text-[16.5px] font-bold text-text-primary transition-colors hover:text-accent">
              Radare
            </Link>
          </nav>

          <nav className="hidden items-center rounded-full bg-surface-card px-3.5 py-2 lg:flex" aria-label="Plattformen">
            {PLATFORM_NAV.map((p) => (
              <Link
                key={p.key}
                href={`/kategorie/${p.key}`}
                title={p.label}
                aria-label={p.label}
                className="px-1.5 text-text-secondary transition-colors hover:text-text-primary"
              >
                <PlatformIcon platform={p.key} className="h-[19px] w-[19px]" />
              </Link>
            ))}
          </nav>

          <span className="hidden lg:block">
            <SearchTrigger />
          </span>
          <AuthStatus />
          <MobileNav instagramUrl="https://www.instagram.com/republicofpixels" />
        </div>
      </div>
      {/* Zeigt sich nur, wenn wirklich Breaking läuft. */}
      <BreakingTicker />
    </>
  );
}
