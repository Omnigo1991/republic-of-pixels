"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CATEGORY_NAV, PLATFORM_NAV } from "@/lib/articles";
import { PlatformIcon } from "./PlatformIcons";

export function MobileNav({ instagramUrl }: { instagramUrl: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex items-center gap-1 lg:hidden">
      <Link
        href="/suche"
        aria-label="Suche öffnen"
        className="flex h-10 w-10 items-center justify-center rounded-full text-current hover:opacity-70 transition-opacity"
      >
        <SearchIcon className="h-5 w-5" />
      </Link>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full text-current hover:opacity-70 transition-opacity"
      >
        <BurgerIcon className="h-5 w-5" />
      </button>

      {/* Portal nach document.body: Der Header nutzt backdrop-filter und wird
          dadurch zum Containing Block für fixed-Elemente — ohne Portal würde
          das Overlay im 64px-Header gefangen (auf Mobile entdeckt, 04.08.2026). */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col bg-navy animate-fadeIn">
          <div className="flex h-16 items-center justify-between px-4 border-b border-navy-border">
            <span className="text-[13px] font-semibold tracking-[0.2em] text-navy-dim">
              MENÜ
            </span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Menü schliessen"
              className="flex h-10 w-10 items-center justify-center rounded-full text-navy-muted hover:text-navy-text hover:bg-white/[0.06]"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-8">
            <p className="mb-3 text-[12px] font-semibold tracking-[0.2em] text-navy-dim">
              HOME
            </p>
            <nav className="mb-8 flex flex-col">
              {CATEGORY_NAV.map((c) => (
                <Link
                  key={c.key}
                  href={`/kategorie/${c.key}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-b border-navy-border py-4 text-xl font-medium text-navy-text active:text-accent"
                >
                  {c.label}
                  {c.key === "breaking" && <span className="h-2 w-2 rounded-full bg-accent animate-pulseDot" />}
                </Link>
              ))}
            </nav>

            <p className="mb-3 text-[12px] font-semibold tracking-[0.2em] text-navy-dim">
              PLATTFORMEN
            </p>
            <nav className="mb-8 flex flex-col">
              {PLATFORM_NAV.map((p) => (
                <Link
                  key={p.key}
                  href={`/kategorie/${p.key}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 border-b border-navy-border py-4 text-xl font-medium text-navy-text active:text-accent"
                >
                  <PlatformIcon platform={p.key} className="h-5 w-5 text-navy-dim" />
                  {p.label}
                </Link>
              ))}
            </nav>

            <a
              href={instagramUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-center gap-2 rounded-full border border-accent/40 py-3.5 text-[15px] font-medium text-accent"
            >
              Auf Instagram folgen
            </a>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function BurgerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
    </svg>
  );
}
