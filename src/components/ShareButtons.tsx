"use client";

import { useEffect, useState } from "react";
import { KanalIcon, kanaeleFuer, type Kanal } from "./TeilenKanaele";

// Teilen-Reihe am Artikelende — bewusst BEHALTEN (Tim-Entscheid
// 09.08.2026): Sie steht im Moment der höchsten Teilen-Bereitschaft,
// direkt nach dem Lesen. Sie nutzt jetzt aber dieselbe Mechanik und
// dieselben Kanäle wie der schwebende Knopf (siehe TeilenKanaele) —
// ein System mit zwei Eingängen.
export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const [kopiert, setKopiert] = useState<string | null>(null);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  async function kanalOeffnen(kanal: Kanal) {
    if (kanal.key === "kopieren" || kanal.kopieren) {
      try {
        await navigator.clipboard.writeText(url);
        setKopiert(kanal.key);
        setTimeout(() => setKopiert(null), 2200);
      } catch {
        // Zwischenablage gesperrt — unkritisch
      }
      if (kanal.key === "kopieren") return;
    }
    if (kanal.href) window.open(kanal.href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold tracking-wide text-text-tertiary">TEILEN</span>

      {/* Kein zusätzlicher "Menü öffnen"-Knopf (Tim, 09.08.2026): Das
          native Teilen-Menü erreicht man über den schwebenden Knopf —
          hier zählen die direkten Kanäle. */}
      {kanaeleFuer(url, title).map((k) => (
        <button
          key={k.key}
          onClick={() => kanalOeffnen(k)}
          aria-label={`Artikel via ${k.label} teilen`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-default px-3.5 py-1.5 text-[13px] font-medium leading-none text-text-secondary transition-colors hover:border-accent/50 hover:text-accent"
        >
          <span className="flex h-4 items-center">
            <KanalIcon kanal={k.key} basis={16} />
          </span>
          <span className="flex h-4 items-center">{kopiert === k.key ? "Kopiert ✓" : k.label}</span>
        </button>
      ))}
    </div>
  );
}
