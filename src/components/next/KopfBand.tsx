import Link from "next/link";
import { MenueKarte } from "./MenueKarte";
import { PlatformIcon } from "@/components/PlatformIcons";
import { PLATFORM_NAV } from "@/lib/articles";
import { AuthStatus } from "@/components/AuthStatus";
import { GLAS } from "./Bausteine";

// Kopfband im neuen Design (Tim-Freigabe 22.08.2026): eine schwebende
// Glasleiste statt eines angeklebten Bands. Sie liegt fest am oberen
// Rand und begleitet den Leser über die ganze Seite.
//
// Der Glasgrund ist bewusst dunkel (78 Prozent Navy): Über hellen
// Artikelbildern war die durchscheinende Fassung nicht mehr lesbar
// (gemessen 22.08.2026).
// Guides und Themen sind vorerst raus (Tim, 22.08.2026) - sie kommen
// in Ruhe im neuen Layout zurueck.
const BEREICHE = [
  { href: "/kategorie/news", text: "News" },
  { href: "/#radare", text: "Radare" },
];

export function KopfBand() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 pb-2.5 pt-3 sm:pt-4">
      <div className="relative mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <div
          className={`pointer-events-auto flex h-[52px] items-center gap-3 rounded-full border border-white/[0.16] bg-[rgba(12,11,26,0.78)] pl-4 pr-2 text-[13px] font-medium text-[#F2F8FF] backdrop-blur-[22px] backdrop-saturate-150 sm:h-[58px] sm:gap-8 sm:pl-5.5 sm:pr-3`}
        >
          <Link
            href="/"
            aria-label="Republic of Pixels - Startseite"
            className="mr-auto flex items-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-mark.png" alt="" aria-hidden="true" className="h-[26px] w-auto sm:h-[30px]" />
            <span className="leading-[1.05]">
              <span className="block text-[12px] font-extrabold tracking-[0.02em] sm:text-[13px]">
                REPUBLIC
              </span>
              <span className="mt-[2px] block text-[7px] font-extrabold tracking-[0.34em] text-accent sm:text-[7.5px]">
                OF PIXELS
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex" aria-label="Bereiche">
            {BEREICHE.map((b) => (
              <Link key={b.href} href={b.href} className="transition-opacity hover:opacity-70">
                {b.text}
              </Link>
            ))}
          </nav>

          {/* Plattformen als Zeichengruppe im neuen Kleid (Tim,
              22.08.2026): eine Glasflaeche, Zeichen in Weiss. */}
          <nav
            aria-label="Plattformen"
            className="hidden items-center gap-1 rounded-full bg-white/[0.08] px-2.5 py-1.5 lg:flex"
          >
            {PLATFORM_NAV.map((p) => (
              <Link
                key={p.key}
                href={`/kategorie/${p.key}`}
                title={p.label}
                aria-label={p.label}
                className="px-1.5 text-[#C7CAD8] transition-colors hover:text-white"
              >
                <PlatformIcon platform={p.key} className="h-[18px] w-[18px]" />
              </Link>
            ))}
          </nav>

          <Link
            href="/suche"
            aria-label="Suche"
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-white/[0.14] sm:h-[38px] sm:w-[38px]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 5 5" />
            </svg>
          </Link>

          <AuthStatus />
          <MenueKarte />
        </div>
      </div>
    </div>
  );
}

/** Fussbereich: die Social-Bühne schliesst die Seite ab. */
export function SocialBuehne() {
  // Zeichen und Beschriftung exakt wie im Entwurf (Pfaddaten daraus
  // uebernommen, 22.08.2026).
  const kanaele = [
    {
      name: "Instagram",
      href: "https://www.instagram.com/republicofpixels/",
      zeichen: (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5.5" />
          <circle cx="12" cy="12" r="4.2" />
          <circle cx="17.4" cy="6.6" r="1.2" fill="#fff" stroke="none" />
        </svg>
      ),
    },
    {
      name: "X",
      href: "https://x.com/republic_pixels",
      zeichen: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
          <path d="M3 2.5h5l4.7 6.3 5.4-6.3h2.6l-6.8 8 7.4 11h-5l-5-7-6 7H2.7l7.3-8.6z" />
        </svg>
      ),
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/@republicofpixels",
      zeichen: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
          <path d="M16.2 2c.4 2.6 1.9 4.2 4.6 4.4v3.1c-1.8 0-3.3-.5-4.6-1.5v6.8a6.3 6.3 0 1 1-6.3-6.3c.4 0 .7 0 1.1.1v3.3a3.1 3.1 0 1 0 2.1 2.9V2h3.1z" />
        </svg>
      ),
    },
  ];
  return (
    <footer className="schrift-normal mt-20 bg-[radial-gradient(ellipse_50%_70%_at_50%_112%,rgba(255,46,151,0.18),transparent),radial-gradient(ellipse_44%_60%_at_22%_108%,rgba(2,240,209,0.12),transparent)] px-4 pb-8 pt-[90px] text-center sm:px-6 lg:px-8">
      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8F95A9]">
        Die Republic auf Social Media
      </div>
      <div className="mx-auto mt-3 w-fit bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] bg-clip-text text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-transparent sm:text-[46px] lg:text-[60px]">
        Kein Post. Kein Reel.
        <br />
        Verpasst.
      </div>
      <p className="mx-auto mt-3.5 max-w-[520px] text-[15px] text-[#a1a1a6] sm:text-[17px]">
        Breaking-Karten, Reels und die besten Bilder - täglich im Feed.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3.5">
        {kanaele.map((k) => (
          <a
            key={k.name}
            href={k.href}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.22] bg-white/[0.12] px-6 py-3.5 text-[15px] font-semibold text-[#F2F8FF] backdrop-blur-[14px]"
          >
            {k.zeichen}
            {k.name}
          </a>
        ))}
      </div>
      <div className="mx-auto mt-16 max-w-content border-t border-white/[0.12] pt-[30px] text-[12px] text-[#8F95A9]">
        Copyright © 2026 Republic of Pixels. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
