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
// Burger-Menü mit dem kompletten Mobile-Inhalt - auf allen Breiten.

// Kein Header-Staub mehr (Tim, 19.08.2026): restlos entfernt.

export function Masthead({
  variant: _variant = "slim",
  word: _word,
}: {
  variant?: "brand" | "section" | "slim";
  word?: string;
}) {
  return (
    <>
      <div className="kopfband sticky z-50 text-white">
        <div className="relative mx-auto flex h-16 max-w-content items-center gap-5 px-4 sm:px-6 lg:h-[88px] lg:gap-7 lg:px-8">
          <Link href="/" aria-label="Republic of Pixels - Startseite" className="mr-auto flex min-w-0 items-center gap-2.5 sm:gap-3 lg:gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-mark.png" alt="" aria-hidden="true" className="h-10 w-auto sm:h-11 lg:h-14" />
            {/* Schriftzug IMMER voll und einzeilig (Tim, 16.08.2026) -
                auf schmalen Geraeten faellt er kleiner aus, statt zu
                kuerzen oder umzubrechen. */}
            {/* Lockup S3+Z3 (Tim-Freigabe 22.08.2026): REPUBLIC gross und
                mit Druckversatz (Cyan/Magenta, wie die Schlagzeilen der
                Seite), darunter OF PIXELS klein und gesperrt in Cyan -
                das Prinzip grosser Zeitungsmarken. Der Versatz liegt in
                globals.css (.kopfband .versatz), weil das Kopfband sonst
                jeden Schatten unterdrueckt. */}
            <span className="translate-y-[1px]">
              <span className="versatz block text-[16px] font-black leading-[1.05] tracking-[0.01em] sm:text-[18px] lg:text-[23px]">
                REPUBLIC
              </span>
              <span className="mt-[2px] block text-[7.5px] font-black leading-[1.05] tracking-[0.33em] text-accent sm:text-[8.5px] lg:text-[10.5px] lg:tracking-[0.36em]">
                OF PIXELS
              </span>
            </span>
          </Link>

          {/* Pure Textlinks mit Sprungzielen (ohne Pillenbox, Tim-Vorgabe). */}
          <nav className="hidden items-center gap-7 lg:ml-10 lg:flex" aria-label="Bereiche">
            <Link href="/#news" className="text-[16.5px] font-bold text-white transition-colors hover:text-accent">
              News
            </Link>
            <Link href="/#guides" className="text-[16.5px] font-bold text-white transition-colors hover:text-accent">
              Guides
            </Link>
            <Link href="/#radare" className="text-[16.5px] font-bold text-white transition-colors hover:text-accent">
              Radare
            </Link>
          </nav>

          <nav className="hidden items-center rounded-full bg-[#1B1A33] px-3.5 py-2 lg:flex" aria-label="Plattformen">
            {PLATFORM_NAV.map((p) => (
              <Link
                key={p.key}
                href={`/kategorie/${p.key}`}
                title={p.label}
                aria-label={p.label}
                className="px-1.5 text-[#C7CAD8] transition-colors hover:text-white"
              >
                <PlatformIcon platform={p.key} className="h-[19px] w-[19px]" />
              </Link>
            ))}
          </nav>

          <span className="hidden lg:block">
            <SearchTrigger />
          </span>
          {/* Auch am Handy sichtbar (Tim, 21.08.2026): In der alten
              Fassung sass hier das Profil-Icon mit dem Menue (inkl.
              Statistik) - das "hidden sm:block" hatte es am Handy
              wegrasiert, angemeldet gab es dadurch keinen Weg mehr
              dorthin. */}
          <AuthStatus />
          <MobileNav instagramUrl="https://www.instagram.com/republicofpixels" />
        </div>
      </div>
      {/* Zeigt sich nur, wenn wirklich Breaking läuft. */}
      <BreakingTicker />
    </>
  );
}
