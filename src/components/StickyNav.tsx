"use client";

import { useEffect, useState } from "react";
import { MastheadNav } from "./MastheadNav";

// Sticky-Leiste für Seiten mit grossem Masthead (Startseite, Kategorien):
// Sobald das Masthead aus dem Bild gescrollt ist, gleitet die schlanke
// Cyan-Navigationszeile (Artikel-Look, mit R) von oben herein.
export function StickyNav() {
  const [sichtbar, setSichtbar] = useState(false);

  useEffect(() => {
    const onScroll = () => setSichtbar(window.scrollY > 230);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 top-0 z-50 bg-accent-brand text-[#0F0D2C] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] transition-transform duration-300 ${
        sichtbar ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <MastheadNav withMark />
    </div>
  );
}
