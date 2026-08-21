// Footer = Social-Panel (Tim-Freigabe 21.08.2026, Variante A aus dem
// Vergleich): Der komplette Footer ist die Instagram-Buehne im
// Newsletter-Verlauf - grosse Ansage, dunkle CTA-Pille, das Logo als
// Wasserzeichen. Bewusst OHNE Verweis auf X/TikTok, bis die Kanaele
// wirklich laufen. Rechtliches wohnt im Menue; hier bleibt nur die
// Copyright-Zeile.
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
        <InstagramIcon className="pointer-events-none absolute -right-16 top-1/2 h-[340px] w-[340px] -translate-y-1/2 rotate-[8deg] text-[#0B0616] opacity-[0.14] sm:-right-8" />
        <div className="relative">
          {/* Exakt die Schrift des Newsletterblocks (Tim, 22.08.2026):
              gleiche Kopfzeile, gleiche h2-Stufen, gleicher Untertext. */}
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-navy/85">
            Die Republic auf Instagram
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
