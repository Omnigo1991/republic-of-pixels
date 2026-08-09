"use client";

import { useEffect, useState } from "react";
import { KanalIcon, kanaeleFuer, nativTeilen, type Kanal } from "./TeilenKanaele";

// Teilen-Reihe am Artikelende — bewusst BEHALTEN (Tim-Entscheid
// 09.08.2026): Sie steht im Moment der höchsten Teilen-Bereitschaft,
// direkt nach dem Lesen. Sie nutzt jetzt aber dieselbe Mechanik und
// dieselben Kanäle wie der schwebende Knopf (siehe TeilenKanaele) —
// ein System mit zwei Eingängen.
export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const [kopiert, setKopiert] = useState<string | null>(null);
  const [nativDa, setNativDa] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setNativDa(typeof navigator !== "undefined" && !!navigator.share);
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

      {/* Wo das Gerät ein eigenes Teilen-Menü hat, führt der erste Knopf
          direkt dorthin — mit allen installierten Apps. */}
      {nativDa && (
        <button
          onClick={() => nativTeilen(url, title)}
          className="inline-flex items-center gap-1.5 rounded-full border border-accent/50 px-3.5 py-1.5 text-[13px] font-semibold leading-none text-accent transition-colors hover:bg-accent/10"
        >
          Menü öffnen
        </button>
      )}

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
