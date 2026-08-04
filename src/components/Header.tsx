import Link from "next/link";
import { Logo } from "./Logo";
import { CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";
import { MobileNav } from "./MobileNav";
import { SearchTrigger } from "./SearchOverlay";

const INSTAGRAM_URL = "https://www.instagram.com/republicofpixels";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle/80 bg-bg-elevated/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg-elevated/70">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        {/* Content-Kategorien — mittlere Zone, stärker gewichtet (siehe docs/konzept.md §5) */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Redaktion">
          {CATEGORY_NAV.map((c) => (
            <Link
              key={c.key}
              href={`/kategorie/${c.key}`}
              className="relative px-4 py-2 text-[13px] font-medium tracking-wide text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-white/[0.04]"
            >
              {c.key === "breaking" && (
                <span className="absolute left-2 top-2.5 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
              <span className={c.key === "breaking" ? "pl-2.5" : ""}>{c.label.toUpperCase()}</span>
            </Link>
          ))}
        </nav>

        {/* Plattformen + Social — rechte Zone, dezent abgesetzt */}
        <div className="hidden lg:flex items-center gap-3">
          <nav className="flex items-center gap-0.5" aria-label="Plattformen">
            {PLATFORM_NAV.map((p) => (
              <Link
                key={p.key}
                href={`/kategorie/${p.key}`}
                className="px-3 py-2 text-[13px] font-medium text-text-tertiary hover:text-text-primary transition-colors rounded-full hover:bg-white/[0.04]"
              >
                {p.label.toUpperCase()}
              </Link>
            ))}
          </nav>
          <span className="h-5 w-px bg-border-default" aria-hidden="true" />
          <SearchTrigger />
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 rounded-full border border-accent/40 px-3.5 py-1.5 text-[13px] font-medium text-accent hover:bg-accent/10 hover:border-accent transition-colors"
          >
            <InstagramIcon className="h-3.5 w-3.5" />
            Instagram
          </a>
        </div>

        <MobileNav instagramUrl={INSTAGRAM_URL} />
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
