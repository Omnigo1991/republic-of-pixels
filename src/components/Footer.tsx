import Link from "next/link";
import { LogoMark } from "./Logo";
import { CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";
import { PlatformIcon } from "./PlatformIcons";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-navy-border bg-navy">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            {/* Nur das R-Markenzeichen in Logo-Cyan, ohne Wortmarke (Vorgabe 04.08.2026). */}
            <Link href="/" aria-label="Republic of Pixels – Startseite" className="inline-block">
              <LogoMark className="h-10 w-auto text-accent-brand" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-navy-muted">
              Republic of Pixels ist eine unabhängige, deutschsprachige Gaming-Newsplattform.
              Wir ordnen ein, statt nur zu melden — ruhig, ehrlich und ohne Clickbait.
            </p>
            <a
              href="https://www.instagram.com/republicofpixels"
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent-brand/40 px-4 py-2 text-sm font-medium text-accent-brand hover:bg-accent-brand/10 transition-colors"
            >
              @republicofpixels auf Instagram
            </a>
          </div>

          <div>
            <p className="mb-4 text-[12px] font-semibold tracking-[0.2em] text-navy-dim">
              HOME
            </p>
            <ul className="flex flex-col gap-3">
              {CATEGORY_NAV.map((c) => (
                <li key={c.key}>
                  <Link href={`/kategorie/${c.key}`} className="text-sm text-navy-muted hover:text-accent-brand transition-colors">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[12px] font-semibold tracking-[0.2em] text-navy-dim">
              PLATTFORMEN
            </p>
            <ul className="flex flex-col gap-3">
              {PLATFORM_NAV.map((p) => (
                <li key={p.key}>
                  <Link href={`/kategorie/${p.key}`} className="inline-flex items-center gap-2 text-sm text-navy-muted hover:text-accent-brand transition-colors">
                    <PlatformIcon platform={p.key} className="h-3.5 w-3.5 text-navy-dim" />
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[12px] font-semibold tracking-[0.2em] text-navy-dim">
              RECHTLICHES
            </p>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href="/ueber-uns" className="text-sm text-navy-muted hover:text-accent-brand transition-colors">
                  Über uns
                </Link>
              </li>
              <li>
                <Link href="/impressum" className="text-sm text-navy-muted hover:text-accent-brand transition-colors">
                  Impressum
                </Link>
              </li>
              <li>
                <Link href="/datenschutz" className="text-sm text-navy-muted hover:text-accent-brand transition-colors">
                  Datenschutz
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-navy-muted hover:text-accent-brand transition-colors">
                  Cookies
                </Link>
              </li>
              <li>
                <a href="mailto:redaktion@republicofpixels.com" className="text-sm text-navy-muted hover:text-accent-brand transition-colors">
                  Kontakt
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-navy-border pt-8 text-xs text-navy-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Republic of Pixels. Alle Rechte vorbehalten.</p>
          <p>Unabhängige Berichterstattung. Bildmaterial mit Quellenangabe, Quellen in jedem Artikel verlinkt.</p>
        </div>
      </div>
    </footer>
  );
}
