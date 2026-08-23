"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// Dropdown nach dem Entwurf (Tim, 22.08.2026): eine Glaskarte mit drei
// Spalten und der Rechtszeile darunter - kein Vollbild-Vorhang mehr.
// Am Handy dieselbe Karte über die volle Breite.
const SPALTEN: { titel: string; punkte: { text: string; href: string }[] }[] = [
  {
    titel: "Entdecken",
    punkte: [
      { text: "News", href: "/kategorie/news" },
      { text: "Suche", href: "/suche" },
    ],
  },
  {
    titel: "Radare",
    punkte: [
      { text: "Release-Radar", href: "/#radare" },
      { text: "Event-Radar", href: "/#radare" },
      { text: "Charts-Radar", href: "/#radare" },
      { text: "Deal-Radar", href: "/#radare" },
      { text: "Wertungs-Radar", href: "/#radare" },
    ],
  },
  {
    titel: "Republic",
    punkte: [
      { text: "Über uns", href: "/ueber-uns" },
      { text: "Pixel-Raten", href: "/kategorie/news" },
      { text: "Instagram", href: "https://www.instagram.com/republicofpixels/" },
      { text: "Einstellungen", href: "/einstellungen" },
    ],
  },
];

const RECHTLICHES = [
  { text: "Impressum", href: "/impressum" },
  { text: "Datenschutz", href: "/datenschutz" },
  { text: "Cookies", href: "/cookies" },
];

export function MenueKarte() {
  const [offen, setOffen] = useState(false);
  const huelle = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!offen) return;
    const klick = (e: MouseEvent) => {
      if (huelle.current && !huelle.current.contains(e.target as Node)) setOffen(false);
    };
    const taste = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);

  return (
    <div ref={huelle} className="shrink-0">
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-label={offen ? "Menü schliessen" : "Menü öffnen"}
        aria-expanded={offen}
        className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-white/[0.14] sm:h-[38px] sm:w-[38px]"
      >
        <svg viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="h-4 w-4">
          {offen ? <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
        </svg>
      </button>

      {offen && (
        <div className="animate-einblenden absolute inset-x-0 top-[72px] z-[60] w-auto rounded-[24px] border border-white/[0.18] bg-[rgba(13,12,26,0.97)] p-6 backdrop-blur-[22px] sm:inset-x-auto sm:right-6 sm:top-[74px] sm:w-[560px] sm:p-7 lg:right-8">
          <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-3 sm:gap-6">
            {SPALTEN.map((s) => (
              <div key={s.titel}>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#86868b]">
                  {s.titel}
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-2 sm:block sm:space-y-2">
                  {s.punkte.map((p) => (
                    <li key={p.text}>
                      <Link
                        href={p.href}
                        onClick={() => setOffen(false)}
                        className="text-[13.5px] text-[#F2F8FF] transition-opacity hover:opacity-70"
                      >
                        {p.text}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-[26px] pt-[4px] text-left text-[12.5px] text-[#86868b]">
            {RECHTLICHES.map((r, i) => (
              <span key={r.href}>
                {i > 0 && " · "}
                <Link href={r.href} onClick={() => setOffen(false)} className="hover:text-[#F2F8FF]">
                  {r.text}
                </Link>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
