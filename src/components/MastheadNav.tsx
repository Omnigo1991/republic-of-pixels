import Link from "next/link";
import { CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";
import { MobileNav } from "./MobileNav";
import { SearchTrigger } from "./SearchOverlay";
import { PlatformIcon } from "./PlatformIcons";
import { AuthStatus } from "./AuthStatus";

// Gemeinsame Navigationszeile des Mastheads — genutzt vom Masthead selbst
// (slim: mit R, brand/section: ohne R, dort steht es gross darunter) und von
// der Sticky-Leiste, die beim Scrollen hereingleitet (immer mit R).
export function MastheadNav({ withMark = true }: { withMark?: boolean }) {
  return (
    <div className="relative mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6 lg:h-[72px] lg:justify-center lg:gap-3 lg:px-8">
      <Link href="/" aria-label="Republic of Pixels – Startseite" className="flex items-center gap-3.5">
        {/* R immer sichtbar (Betreiber-Vorgabe 05.08.: Header überall wie im
            Scroll-Zustand); withMark bleibt für Sonderfälle erhalten. */}
        {withMark !== false && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/r-mark-navy.png" alt="" aria-hidden="true" className="h-7 w-auto lg:h-9" />
        )}
        {/* leading-none + 1px-Nudge: Versalien haben keine Unterlängen und
            sässen sonst optisch zu hoch gegenüber den Menüpunkten. */}
        <span className="text-[15px] font-black leading-none tracking-tight translate-y-[1px] sm:text-[17px] lg:text-[22px]">
          REPUBLIC<span className="opacity-60"> OF PIXELS</span>
        </span>
      </Link>

      <nav className="hidden lg:flex items-center text-[16px] font-semibold" aria-label="Kategorien">
        <span className="mx-2.5 opacity-40">/</span>
        {CATEGORY_NAV.map((c, i) => (
          <span key={c.key} className="flex items-center">
            {i > 0 && <span className="mx-2.5 opacity-40">/</span>}
            <Link href={`/kategorie/${c.key}`} className="hover:opacity-70 transition-opacity">
              {c.label}
            </Link>
          </span>
        ))}
        {/* Themen-Hubs im Hauptmenü (Leser-Audit 08.08.2026: waren
            sonst nur über Artikel-Chips auffindbar). */}
        <span className="mx-2.5 opacity-40">/</span>
        <Link href="/themen" className="hover:opacity-70 transition-opacity">
          Themen
        </Link>
        <span className="mx-2.5 opacity-40">/</span>
      </nav>

      <nav className="hidden lg:flex items-center gap-4" aria-label="Plattformen">
        {PLATFORM_NAV.map((p) => (
          <Link
            key={p.key}
            href={`/kategorie/${p.key}`}
            title={p.label}
            aria-label={p.label}
            className="hover:opacity-70 transition-opacity"
          >
            <PlatformIcon platform={p.key} className="h-5 w-5" />
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-2 lg:ml-3">
        <span className="hidden lg:block">
          <SearchTrigger />
        </span>
        <AuthStatus />
        <MobileNav instagramUrl="https://www.instagram.com/republicofpixels" />
      </div>
    </div>
  );
}
