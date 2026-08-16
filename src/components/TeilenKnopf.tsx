"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FliegerIcon, KanalIcon, kanaeleFuer, nativTeilen, type Kanal } from "./TeilenKanaele";

// Schwebender Teilen-Knopf unten rechts (Tim-Freigabe 09.08.2026,
// Variante A): nur das Papierflieger-Icon in Cyan, kein Text.
// Er teilt IMMER die Seite, auf der man gerade ist — Startseite teilt die
// Startseite, ein Artikel den Artikel. Klick öffnet das native Teilen-Menü
// des Geräts; wo der Browser keins hat (z. B. Firefox am Desktop), klappt
// unser eigenes Panel mit denselben Kanälen auf.
export function TeilenKnopf() {
  const pfad = usePathname();
  const [offen, setOffen] = useState(false);
  const [sichtbar, setSichtbar] = useState(true);
  const [kopiert, setKopiert] = useState<string | null>(null);
  const huelle = useRef<HTMLDivElement>(null);
  const letzteHoehe = useRef(0);

  // Adresse und Titel erst im Browser lesen (SSR kennt sie nicht).
  const adresse = () => (typeof window === "undefined" ? "" : window.location.href);
  const titel = () => (typeof document === "undefined" ? "Republic of Pixels" : document.title);

  useEffect(() => {
    setOffen(false);
  }, [pfad]);

  // Beim Lesen (runterscrollen) tritt der Knopf zurück, beim Hochscrollen
  // und oben auf der Seite ist er da (Tim, 09.08.2026): Nutzen bleibt,
  // die Aufdringlichkeit verschwindet.
  useEffect(() => {
    letzteHoehe.current = window.scrollY;
    let wartet = false;
    const aufScroll = () => {
      if (wartet) return;
      wartet = true;
      requestAnimationFrame(() => {
        const jetzt = window.scrollY;
        const runter = jetzt > letzteHoehe.current;
        // Kleine Bewegungen ignorieren, damit er nicht flackert.
        if (Math.abs(jetzt - letzteHoehe.current) > 6) {
          setSichtbar(!runter || jetzt < 160);
          letzteHoehe.current = jetzt;
        }
        wartet = false;
      });
    };
    window.addEventListener("scroll", aufScroll, { passive: true });
    return () => window.removeEventListener("scroll", aufScroll);
  }, []);

  useEffect(() => {
    if (!offen) return;
    const aufKlick = (e: MouseEvent) => {
      if (huelle.current && !huelle.current.contains(e.target as Node)) setOffen(false);
    };
    const aufTaste = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", aufKlick);
    document.addEventListener("keydown", aufTaste);
    return () => {
      document.removeEventListener("mousedown", aufKlick);
      document.removeEventListener("keydown", aufTaste);
    };
  }, [offen]);

  const teilen = useCallback(async () => {
    if (offen) {
      setOffen(false);
      return;
    }
    const genutzt = await nativTeilen(adresse(), titel());
    if (!genutzt) setOffen(true);
  }, [offen]);

  async function kanalOeffnen(kanal: Kanal) {
    const url = adresse();
    if (kanal.key === "kopieren" || kanal.kopieren) {
      try {
        await navigator.clipboard.writeText(url);
        setKopiert(kanal.key);
        setTimeout(() => setKopiert(null), 2200);
      } catch {
        // Zwischenablage gesperrt — der Link bleibt über die Adresszeile erreichbar
      }
      if (kanal.key === "kopieren") return;
    }
    if (kanal.href) window.open(kanal.href, "_blank", "noopener,noreferrer");
  }

  const kanaele = kanaeleFuer(adresse(), titel());

  return (
    <div ref={huelle}>
      {offen && (
        <>
          {/* Abdunkeln nur auf Mobile, wo das Panel als Blatt von unten kommt */}
          <div
            className="fixed inset-0 z-40 bg-bg-base/60 sm:hidden"
            onClick={() => setOffen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Seite teilen"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border-subtle bg-bg-elevated p-4 pb-6 shadow-elevated sm:inset-x-auto sm:bottom-24 sm:right-5 sm:w-[328px] sm:rounded-2xl sm:border sm:pb-4"
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border-default sm:hidden" />
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-border-subtle bg-surface-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/r-mark.png" alt="" className="h-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-text-primary">Seite teilen</span>
                <span className="block truncate text-[11.5px] text-text-tertiary">
                  {adresse().replace(/^https?:\/\//, "")}
                </span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {kanaele.map((k) => (
                <button
                  key={k.key}
                  onClick={() => kanalOeffnen(k)}
                  className="rounded-2xl border border-border-subtle bg-surface-card px-1.5 pb-2.5 pt-3 text-center transition-colors hover:border-accent/40 hover:bg-surface-hover"
                >
                  <span className="flex h-7 items-center justify-center text-accent">
                    <KanalIcon kanal={k.key} />
                  </span>
                  <span className="mt-2 block text-[11px] font-semibold text-text-secondary">
                    {kopiert === k.key ? "Kopiert ✓" : k.label}
                  </span>
                </button>
              ))}
            </div>
            {kopiert === "instagram" && (
              <p className="mt-3 text-[11px] leading-relaxed text-text-tertiary">
                Instagram erlaubt kein direktes Teilen im Web — der Link liegt in der
                Zwischenablage und kann dort eingefügt werden.
              </p>
            )}
          </div>
        </>
      )}
      {/* Auf dem Handy liegt das Teilen-Blatt über dem Knopf und würde die
          letzte Kachel verdecken — solange es offen ist, tritt er zurück. */}
      <button
        onClick={teilen}
        aria-label="Diese Seite teilen"
        aria-expanded={offen}
        className={`treppe-br-klein fixed bottom-5 right-5 z-50 h-[52px] w-[52px] items-center justify-center rounded-xl bg-navy text-accent shadow-[0_10px_28px_-10px_rgba(12,11,26,0.5)] transition-all duration-300 hover:opacity-90 sm:bottom-6 sm:right-6 sm:flex ${offen ? "hidden" : "flex"} ${
          sichtbar || offen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <FliegerIcon />
      </button>
    </div>
  );
}
