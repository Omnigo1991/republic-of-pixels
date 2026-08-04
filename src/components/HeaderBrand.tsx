"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogoMark } from "./Logo";

// Markenzeile im Sticky-Header: Beim Scrollen gleitet das R-Zeichen in den
// Header hinein (das grosse R unter dem Header scrollt ja aus dem Bild) —
// so bleibt die Marke jederzeit sichtbar. Schwelle ≈ Position des grossen R.
export function HeaderBrand() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 120);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <Link
      href="/"
      aria-label="Republic of Pixels – Startseite"
      className="flex shrink-0 items-center px-1"
    >
      <span
        aria-hidden="true"
        className={`overflow-hidden transition-all duration-300 ease-out ${
          scrolled ? "w-7 opacity-100" : "w-0 opacity-0"
        }`}
      >
        <LogoMark className="h-6 w-auto text-accent-brand" />
      </span>
      <span
        className={`whitespace-nowrap text-[13px] font-bold tracking-wide text-accent-brand transition-all duration-300 ${
          scrolled ? "ml-2" : "ml-0"
        }`}
      >
        REPUBLIC OF PIXELS
      </span>
    </Link>
  );
}
