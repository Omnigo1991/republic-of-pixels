import Link from "next/link";
import { MobileNav } from "@/components/MobileNav";
import { AuthStatus } from "@/components/AuthStatus";
import { GLAS } from "./Bausteine";

// Kopfband im neuen Design (Tim-Freigabe 22.08.2026): eine schwebende
// Glasleiste statt eines angeklebten Bands. Sie liegt fest am oberen
// Rand und begleitet den Leser über die ganze Seite.
//
// Der Glasgrund ist bewusst dunkel (78 Prozent Navy): Über hellen
// Artikelbildern war die durchscheinende Fassung nicht mehr lesbar
// (gemessen 22.08.2026).
const BEREICHE = [
  { href: "/#news", text: "News" },
  { href: "/guides", text: "Guides" },
  { href: "/#radare", text: "Radare" },
  { href: "/themen", text: "Themen" },
];

export function KopfBand() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 pb-2.5 pt-3 sm:pt-4">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
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
          <MobileNav instagramUrl="https://www.instagram.com/republicofpixels" />
        </div>
      </div>
    </div>
  );
}

/** Fussbereich: die Social-Bühne schliesst die Seite ab. */
export function SocialBuehne() {
  const kanaele = [
    { name: "Instagram", href: "https://www.instagram.com/republicofpixels/" },
    { name: "X", href: "https://x.com/republic_pixels" },
    { name: "TikTok", href: "https://www.tiktok.com/@republicofpixels" },
  ];
  return (
    <footer className="schrift-normal mt-20 bg-[radial-gradient(ellipse_50%_70%_at_50%_112%,rgba(255,46,151,0.18),transparent),radial-gradient(ellipse_44%_60%_at_22%_108%,rgba(2,240,209,0.12),transparent)] px-4 pb-8 pt-[90px] text-center sm:px-6 lg:px-8">
      <div className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8F95A9]">
        Die Republic auf Social Media
      </div>
      <div className="mx-auto mt-3 w-fit bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] bg-clip-text text-[30px] font-bold leading-[1.1] tracking-[-0.02em] text-transparent sm:text-[44px] lg:text-[52px]">
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
            className={`${GLAS} rounded-full px-5 py-3 text-[15px] font-semibold text-[#F2F8FF]`}
          >
            {k.name}
          </a>
        ))}
      </div>
      <div className="mx-auto mt-16 max-w-content border-t border-white/[0.12] pt-[30px] text-[12px] text-[#8F95A9]">
        <p>
          Die Berichterstattung basiert auf verlinkten Originalquellen. Leaks und Gerüchte sind als
          unbestätigt gekennzeichnet.
        </p>
        <p className="mt-2.5">
          <Link href="/impressum" className="hover:text-[#F2F8FF]">Impressum</Link>
          {" · "}
          <Link href="/datenschutz" className="hover:text-[#F2F8FF]">Datenschutz</Link>
          {" · "}
          <Link href="/cookies" className="hover:text-[#F2F8FF]">Cookies</Link>
          {" · "}
          <Link href="/ueber-uns" className="hover:text-[#F2F8FF]">Über uns</Link>
        </p>
        <p className="mt-2.5">Copyright © 2026 Republic of Pixels. Alle Rechte vorbehalten.</p>
      </div>
    </footer>
  );
}
