import Link from "next/link";
import { Logo } from "./Logo";
import { CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";
import { MobileNav } from "./MobileNav";
import { SearchTrigger } from "./SearchOverlay";
import { PlatformIcon } from "./PlatformIcons";

const INSTAGRAM_URL = "https://www.instagram.com/republicofpixels";

// Header-Variante V3 (Betreiber-Entscheidung 05.08.2026): zweizeilig im
// Portal-Stil — Zeile 1 Marke + Suche/Instagram, Zeile 2 eigene Navigations-
// leiste. Nicht sticky: scrollt komplett mit der Seite (Omnigo-Vorbild).
// Abstands-Raster: ALLE Navigationselemente (Kategorie-Buttons wie Plattform-
// Icons) nutzen identisches px-4-Padding → gleiche Abstände links und rechts.
export function Header() {
  return (
    <header className="border-b border-navy-border bg-navy">
      {/* Zeile 1: Marke */}
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo inline size="lg" />
        <div className="hidden lg:flex items-center gap-4">
          <SearchTrigger />
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 rounded-full border border-accent-brand/40 px-3.5 py-1.5 text-[13px] font-medium text-accent-brand hover:bg-accent-brand/10 hover:border-accent-brand transition-colors"
          >
            <InstagramIcon className="h-3.5 w-3.5" />
            Instagram
          </a>
        </div>
        <MobileNav instagramUrl={INSTAGRAM_URL} />
      </div>

      {/* Zeile 2: Navigation (Desktop) */}
      <div className="hidden lg:block border-t border-navy-border bg-navy-raised">
        <div className="mx-auto flex h-12 max-w-content items-center justify-between px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center" aria-label="Kategorien">
            {CATEGORY_NAV.map((c) => (
              <Link
                key={c.key}
                href={`/kategorie/${c.key}`}
                className="relative px-4 py-2 text-[13px] font-medium tracking-wide text-navy-muted hover:text-navy-text transition-colors rounded-full hover:bg-white/[0.06]"
              >
                {c.key === "breaking" && (
                  <span className="absolute left-2 top-2.5 h-1.5 w-1.5 rounded-full bg-accent-brand animate-pulseDot" />
                )}
                <span className={c.key === "breaking" ? "pl-2.5" : ""}>{c.label.toUpperCase()}</span>
              </Link>
            ))}
          </nav>
          <nav className="flex items-center" aria-label="Plattformen">
            {PLATFORM_NAV.map((p) => (
              <Link
                key={p.key}
                href={`/kategorie/${p.key}`}
                title={p.label}
                aria-label={p.label}
                className="flex items-center justify-center px-4 py-2 text-navy-dim hover:text-navy-text transition-colors rounded-full hover:bg-white/[0.06]"
              >
                <PlatformIcon platform={p.key} className="h-[18px] w-[18px]" />
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
