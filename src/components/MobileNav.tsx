"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { PLATFORM_NAV } from "@/lib/articles";
import { PlatformIcon } from "./PlatformIcons";
import { getSupabase } from "@/lib/supabase";
import { SearchPanel } from "./SearchOverlay";

// DER CYAN-VORHANG (Tim, 15.08.2026 abends): Das Menü ist eine
// Markenbühne - ein voller Cyan-Vorhang, der von rechts hereingleitet
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

  // ANGEMELDET-ZUSTAND (Tim, 21.08.2026): Der Knopf zeigte stur
  // "Anmelden", auch nach erfolgreichem Login - am Handy gibt es keine
  // andere Stelle, die den Zustand anzeigt. Jetzt hoert das Menue auf
  // die Sitzung und beschriftet den Knopf entsprechend.
  const supabase = useMemo(() => getSupabase(), []);
  const [angemeldet, setAngemeldet] = useState(false);
  const [sucheAktiv, setSucheAktiv] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAngemeldet(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_ereignis, sitzung) => {
      setAngemeldet(!!sitzung);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);
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
      {/* Direkt tippen statt Seitenwechsel (Tim, 21.08.2026): Die Lupe
          oeffnet den Vorhang gleich im Suchmodus. */}
      <button
        onClick={() => { setSucheAktiv(true); setOpen(true); }}
        aria-label="Suche öffnen"
        className="flex h-10 w-10 items-center justify-center rounded-full text-current hover:opacity-70 transition-opacity lg:hidden"
      >
        <SearchIcon className="h-5 w-5" />
      </button>
      <button
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full text-current hover:opacity-70 transition-opacity"
      >
        <BurgerIcon className="h-5 w-5" />
      </button>

      {/* Portal nach document.body: Der Header nutzt backdrop-filter und wird
          dadurch zum Containing Block für fixed-Elemente - ohne Portal würde
          das Overlay im Header gefangen (auf Mobile entdeckt, 04.08.2026). */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[60]">
          {/* Klick neben den Vorhang schliesst. */}
          <button
            aria-label="Menü schliessen"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy/40"
          />
          <aside className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-accent px-7 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] pt-[calc(1.25rem+env(safe-area-inset-top,0px))] shadow-[-30px_0_80px_-20px_rgba(12,11,26,0.45)] animate-vorhang sm:w-[430px]">
            <button
              onClick={() => { setOpen(false); setSucheAktiv(false); }}
              aria-label="Menü schliessen"
              className="flex h-10 w-10 items-center justify-center self-end text-navy hover:opacity-70"
            >
              <CloseIcon className="h-[26px] w-[26px]" />
            </button>

            {/* DIREKTE EINGABE STATT SEITENWECHSEL (Tim, 21.08.2026):
                Der Klick springt nicht mehr nach /suche, sondern klappt
                das echte Suchfeld samt Treffern hier im Menue auf. */}
            {!sucheAktiv && (
              <button
                onClick={() => setSucheAktiv(true)}
                className="mb-3 mt-0.5 flex h-11 w-full items-center gap-3 rounded-full bg-[#0C0B1A]/10 px-5 text-left text-[15px] font-semibold text-[#0B0616]"
              >
                Suche nach Spielen, News, Guides …
                <SearchIcon className="ml-auto h-5 w-5 shrink-0" />
              </button>
            )}
            {sucheAktiv && (
              <div className="flex min-h-0 flex-1 flex-col">
                <button
                  onClick={() => setSucheAktiv(false)}
                  className="mb-3 mt-1 self-start text-[14px] font-bold text-navy hover:opacity-70"
                >
                  &larr; Zurück zum Menü
                </button>
                {/* Navy-Teppich, damit die dunkle Such-Optik auf dem
                    Cyan-Vorhang lesbar bleibt. */}
                <div className="suchliste animate-einblenden min-h-0 flex-1 overflow-y-auto rounded-2xl bg-bg-base p-3">
                  <SearchPanel onNavigate={() => { setSucheAktiv(false); setOpen(false); }} />
                </div>
              </div>
            )}

            {!sucheAktiv && (
            <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto" aria-label="Menü">
              {RUBRIKEN.map((r) => (
                <Link
                  key={r.label}
                  href={r.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between border-t-2 border-navy px-0.5 py-[6px] text-[19px] font-black tracking-tight text-navy transition-opacity hover:opacity-70 min-[380px]:py-2.5 min-[380px]:text-[22px] sm:py-3.5 sm:text-[23px]"
                >
                  {/* Ohne Pfeil (Tim, 20.08.2026): eine Zeile im Menue ist
                      ohnehin erkennbar anklickbar. */}
                  <span className="flex items-center gap-3">
                    {r.label}
                    {r.puls && <span className="h-2 w-2 rounded-full bg-navy animate-pulseDot" />}
                  </span>
                </Link>
              ))}
              <div className="flex items-center justify-between border-y-2 border-navy px-0.5 py-[6px] min-[380px]:py-2.5 sm:py-3.5">
                <span className="text-[19px] font-black tracking-tight text-navy min-[380px]:text-[22px] sm:text-[23px]">Plattformen</span>
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

              {/* Ueber uns als eigene Zeile unter den Plattformen
                  (Tim, 21.08.2026) - aus der Kleingedruckt-Zeile
                  herausgeloest. */}
              <Link
                href="/ueber-uns"
                onClick={() => setOpen(false)}
                className="flex items-center justify-between border-b-2 border-navy px-0.5 py-[6px] text-[19px] font-black tracking-tight text-navy transition-opacity hover:opacity-70 min-[380px]:py-2.5 min-[380px]:text-[22px] sm:py-3.5 sm:text-[23px]"
              >
                Über uns
              </Link>

              <Link
                href="/profil"
                onClick={() => setOpen(false)}
                className="mt-3 flex items-center justify-center gap-2 rounded-full bg-navy py-2.5 text-[15px] font-extrabold text-accent sm:hidden"
              >
                {angemeldet ? "Mein Konto" : "Anmelden"}
              </Link>

              <div className="mt-3 flex items-center justify-between gap-3.5">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0B0616] text-[#0B0616] hover:opacity-70"
                >
                  <InstagramIcon className="h-5 w-5" />
                </a>
                <a
                  href="mailto:redaktion@republicofpixels.com"
                  aria-label="Kontakt"
                  className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#0B0616] text-[#0B0616] hover:opacity-70"
                >
                  <MailIcon className="h-5 w-5" />
                </a>
                {/* Rechtliches hier statt im Footer (Tims Idee,
                    21.08.2026): der Footer gehoert jetzt den
                    Social-Kanaelen. Kompakt neben den Kreisen, damit
                    auch kleine Geraete ohne Scrollen auskommen. */}
                <span className="flex max-w-[210px] flex-wrap items-center justify-end gap-x-3 gap-y-1 text-right">
                  {[
                    ["Impressum", "/impressum"],
                    ["Datenschutz", "/datenschutz"],
                    ["Cookies", "/cookies"],
                  ].map(([label, href]) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="text-[12px] font-semibold text-navy/70 hover:text-navy"
                    >
                      {label}
                    </Link>
                  ))}
                  <a href="mailto:redaktion@republicofpixels.com" className="text-[12px] font-semibold text-navy/70 hover:text-navy">
                    Kontakt
                  </a>
                </span>
              </div>
            </nav>
            )}

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
