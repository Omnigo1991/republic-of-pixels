"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { PLATFORM_NAV } from "@/lib/articles";
import { PlatformIcon } from "./PlatformIcons";

// DER CYAN-VORHANG (Tim, 15.08.2026 abends): Das Menü ist eine
// Markenbühne — ein voller Cyan-Vorhang, der von rechts hereingleitet
// (Polygon-Geste, unsere Sprache). Suche zuoberst, dann die Rubriken in
// der Display-Stimme, Plattformen als Icon-Zeile, Instagram und Kontakt
// als Kreise. Eine Geste für alle Bildschirmgrössen: auf dem Handy
// bildschirmfüllend, auf dem Desktop 430px breit.
//
// Reihenfolge der Rubriken ist Tims Vorgabe; Radare ergänzt, weil der
// Header News/Guides/Radare führt und das Menü als Inhaltsverzeichnis
// alle Ziele kennen muss.
const RUBRIKEN: { label: string; href: string; puls?: boolean }[] = [
  { label: "Breaking", href: "/kategorie/breaking", puls: true },
  { label: "News", href: "/kategorie/news" },
  { label: "Guides", href: "/guides" },
  { label: "Leaks", href: "/kategorie/leaks" },
  { label: "Reviews", href: "/kategorie/reviews" },
  { label: "Radare", href: "/#radare" },
  { label: "Themen", href: "/themen" },
];

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
    <div className="flex items-center gap-1">
      <Link
        href="/suche"
        aria-label="Suche öffnen"
        className="flex h-10 w-10 items-center justify-center rounded-full text-current hover:opacity-70 transition-opacity lg:hidden"
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
          das Overlay im Header gefangen (auf Mobile entdeckt, 04.08.2026). */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[60]">
          {/* Klick neben den Vorhang schliesst. */}
          <button
            aria-label="Menü schliessen"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy/40"
          />
          <aside className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-accent px-7 pb-7 pt-5 shadow-[-30px_0_80px_-20px_rgba(12,11,26,0.45)] animate-vorhang sm:w-[430px]">
            {/* Quadrat-Raute als Schmuck in der Ecke — Motiv der Event-Kachel. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-24 -right-24 h-[300px] w-[300px] rotate-45 border-[16px] border-navy/10"
            />
            <button
              onClick={() => setOpen(false)}
              aria-label="Menü schliessen"
              className="flex h-10 w-10 items-center justify-center self-end text-navy hover:opacity-70"
            >
              <CloseIcon className="h-[26px] w-[26px]" />
            </button>

            <Link
              href="/suche"
              onClick={() => setOpen(false)}
              className="mb-5 mt-1 flex items-center gap-3 rounded-2xl bg-navy/10 px-4 py-3.5 text-[15px] font-semibold text-navy"
            >
              Suche nach Spielen, News, Guides …
              <SearchIcon className="ml-auto h-5 w-5 shrink-0" />
            </Link>

            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="Menü">
              {RUBRIKEN.map((r) => (
                <Link
                  key={r.label}
                  href={r.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-t-2 border-navy px-0.5 py-3 text-[23px] font-black tracking-tight text-navy transition-opacity hover:opacity-70 sm:py-3.5"
                >
                  <span className="flex items-center gap-3">
                    {r.label}
                    {r.puls && <span className="h-2 w-2 rounded-full bg-navy animate-pulseDot" />}
                  </span>
                  <span aria-hidden="true" className="text-[21px]">→</span>
                </Link>
              ))}
              <div className="flex items-center justify-between border-y-2 border-navy px-0.5 py-3 sm:py-3.5">
                <span className="text-[23px] font-black tracking-tight text-navy">Plattformen</span>
                <span className="flex items-center gap-3">
                  {PLATFORM_NAV.map((p) => (
                    <Link
                      key={p.key}
                      href={`/kategorie/${p.key}`}
                      onClick={() => setOpen(false)}
                      title={p.label}
                      aria-label={p.label}
                      className="text-navy/75 transition-opacity hover:opacity-60"
                    >
                      <PlatformIcon platform={p.key} className="h-5 w-5" />
                    </Link>
                  ))}
                </span>
              </div>

              <Link
                href="/profil"
                onClick={() => setOpen(false)}
                className="mt-6 flex items-center justify-center gap-2 rounded-full bg-navy py-3.5 text-[15px] font-extrabold text-accent sm:hidden"
              >
                Anmelden
              </Link>

              <div className="mt-6 flex gap-3.5">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-navy text-navy hover:opacity-70"
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
                <a
                  href="mailto:redaktion@republicofpixels.com"
                  aria-label="Kontakt"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-navy text-navy hover:opacity-70"
                >
                  <MailIcon className="h-5 w-5" />
                </a>
              </div>
            </nav>

          </aside>
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className}>
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
function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function MailIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
