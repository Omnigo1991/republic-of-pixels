// Footer = Social-Panel (Tim-Freigabe 21.08.2026, Variante A aus dem
// Vergleich): Der komplette Footer ist die Instagram-Buehne im
// Newsletter-Verlauf - grosse Ansage, dunkle CTA-Pille, das Logo als
// Wasserzeichen. Bewusst OHNE Verweis auf X/TikTok, bis die Kanaele
// wirklich laufen. Rechtliches wohnt im Menue; hier bleibt nur die
// Copyright-Zeile.
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298 0 .595.046.88.138V9.4a6.33 6.33 0 0 0-.88-.05A6.34 6.34 0 0 0 3.15 15.7a6.34 6.34 0 0 0 10.86 4.44 6.37 6.37 0 0 0 1.82-4.47V8.55a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.01.02z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden">
      <div className="relative mx-auto max-w-content px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        {/* Wasserzeichen: gross, gedreht, rechts angeschnitten */}
        {/* Wasserzeichen-Trio (Tim, 22.08.2026): Instagram gross, X und
            TikTok daneben - alle in derselben leisen Kontur. */}
        <InstagramIcon className="pointer-events-none absolute -right-10 top-1/2 h-[320px] w-[320px] -translate-y-[62%] rotate-[8deg] text-[#0B0616] opacity-[0.14] sm:right-0" />
        <XIcon className="pointer-events-none absolute right-[430px] top-[16%] hidden h-[140px] w-[140px] -rotate-[7deg] text-[#0B0616] opacity-[0.12] lg:block" />
        <TikTokIcon className="pointer-events-none absolute right-[400px] top-[58%] hidden h-[160px] w-[160px] rotate-[5deg] text-[#0B0616] opacity-[0.12] lg:block" />
        <div className="relative">
          {/* Exakt die Schrift des Newsletterblocks (Tim, 22.08.2026):
              gleiche Kopfzeile, gleiche h2-Stufen, gleicher Untertext. */}
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-navy/85">
            Die Republic auf Social Media
          </p>
          <h2 className="mt-[10px] max-w-[16ch] text-[30px] font-black leading-[1.08] tracking-[-0.02em] text-navy sm:text-[44px]">
            Kein Post. Kein Reel. Verpasst.
          </h2>
          <p className="mt-[18px] mb-7 max-w-[46ch] text-[16px] leading-[1.55] text-navy/85 sm:text-[17px]">
            Breaking-Karten, Reels und die besten Bilder - täglich im Feed.
          </p>
          <a
            href="https://www.instagram.com/republicofpixels"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2.5 rounded-full bg-[#0B0616] px-6 py-3.5 text-[15px] font-extrabold text-[#02F0D1] transition-opacity hover:opacity-85"
          >
            <InstagramIcon className="h-5 w-5" />
            @republicofpixels folgen
          </a>
        </div>
        <p className="relative mt-12 text-[12px] font-semibold text-[#0B0616]/80">
          © 2026 Republic of Pixels - unabhängige, deutschsprachige Gaming-News.
        </p>
      </div>
    </footer>
  );
}
