"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { getAllArticles } from "@/lib/articles";

// Wischen wie bei einer Partnerbörse: rechts = interessiert mich,
// links = interessiert mich nicht.
//
// Zwei Entscheidungen, die den Ausschlag gaben:
//
// 1. OHNE KONTO NUTZBAR. Wer zum ersten Mal hier ist, soll sofort
//    losspielen können. Das Urteil liegt darum im Browser (localStorage).
//    Wer angemeldet ist, bekommt die Themen zusätzlich auf die Merkliste
//    geschrieben - dann folgt die Auswahl aufs andere Gerät mit.
//
// 2. WISCHEN IST NICHT DIE EINZIGE BEDIENUNG. Mit der Maus wischt kaum
//    jemand, und mit der Tastatur gar niemand. Es gibt deshalb immer auch
//    zwei Knöpfe und die Pfeiltasten. Das Wischen ist die schnelle
//    Abkürzung, nicht der einzige Weg.

const SPEICHER = "rop-swipe-urteile-v1";
const SCHWELLE = 110; // px, ab hier zählt die Bewegung als Urteil

type Urteil = "ja" | "nein";
type Urteile = Record<string, Urteil>;

function urteileLaden(): Urteile {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(SPEICHER) ?? "{}") as Urteile;
  } catch {
    return {};
  }
}

export function SwipeStapel({ anzahl = 12 }: { anzahl?: number }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [urteile, setUrteile] = useState<Urteile>({});
  const [geladen, setGeladen] = useState(false);
  const [zug, setZug] = useState({ x: 0, y: 0, aktiv: false });
  const [flug, setFlug] = useState<Urteil | null>(null);
  const [meldung, setMeldung] = useState("");

  const start = useRef<{ x: number; y: number } | null>(null);
  const karteRef = useRef<HTMLDivElement>(null);
  // Der zuletzt gemessene Zug. Nötig, weil beim Loslassen mit aktivem
  // Pointer-Capture die Koordinaten nicht mehr verlässlich sind - daraus
  // wurde jeder Wisch als "nein" gewertet, egal in welche Richtung.
  const zugRef = useRef(0);

  useEffect(() => {
    setUrteile(urteileLaden());
    setGeladen(true);
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Eine Tagesration statt eines Fasses ohne Boden: nur Meldungen der
  // letzten drei Tage. Sonst rückt endlos Neues nach, der Zähler steht
  // still und man ist nie fertig - genau das Gefühl, das wir vermeiden.
  const frische = useMemo(() => {
    const grenze = Date.now() - 3 * 24 * 3600000;
    return getAllArticles()
      .filter((a) => +new Date(a.publishedAt) > grenze)
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
      .slice(0, anzahl);
  }, [anzahl]);

  const stapel = useMemo(
    () => (geladen ? frische.filter((a) => !urteile[a.slug]) : []),
    [frische, urteile, geladen]
  );

  const oben = stapel[0];
  const darunter = stapel[1];

  const entscheiden = useCallback(
    (urteil: Urteil) => {
      if (!oben || flug) return;
      setFlug(urteil);
      setMeldung(
        urteil === "ja"
          ? `Gemerkt: ${oben.title}`
          : `Ausgeblendet: ${oben.title}`
      );

      // Bei angemeldeten Nutzer:innen wandern die Themen auf die Merkliste
      if (urteil === "ja" && session) {
        const tags = oben.tags.slice(0, 2);
        void supabase
          .from("watchlist")
          .upsert(
            tags.map((tag) => ({ user_id: session.user.id, tag })),
            { onConflict: "user_id,tag" }
          );
      }

      window.setTimeout(() => {
        setUrteile((alt) => {
          const neu = { ...alt, [oben.slug]: urteil };
          try {
            window.localStorage.setItem(SPEICHER, JSON.stringify(neu));
          } catch {
            /* privater Modus: dann gilt das Urteil nur für diese Sitzung */
          }
          return neu;
        });
        setFlug(null);
        setZug({ x: 0, y: 0, aktiv: false });
      }, 260);
    },
    [oben, flug, session, supabase]
  );

  // Tastatur: Pfeil links/rechts, damit es ohne Zeigegerät bedienbar bleibt
  useEffect(() => {
    function taste(e: KeyboardEvent) {
      if (e.key === "ArrowRight") { e.preventDefault(); entscheiden("ja"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); entscheiden("nein"); }
    }
    window.addEventListener("keydown", taste);
    return () => window.removeEventListener("keydown", taste);
  }, [entscheiden]);

  function zeigerStart(e: React.PointerEvent) {
    if (flug) return;
    start.current = { x: e.clientX, y: e.clientY };
    zugRef.current = 0;
    setZug({ x: 0, y: 0, aktiv: true });
    karteRef.current?.setPointerCapture(e.pointerId);
  }
  function zeigerZug(e: React.PointerEvent) {
    if (!start.current || flug) return;
    const dx = e.clientX - start.current.x;
    zugRef.current = dx;
    setZug({ x: dx, y: (e.clientY - start.current.y) * 0.35, aktiv: true });
  }
  function zeigerEnde(e: React.PointerEvent) {
    if (!start.current || flug) return;
    const dx = zugRef.current; // aus der letzten Bewegung, nicht aus dem Loslass-Ereignis
    start.current = null;
    zugRef.current = 0;
    if (karteRef.current?.hasPointerCapture(e.pointerId)) {
      karteRef.current.releasePointerCapture(e.pointerId);
    }
    if (dx > SCHWELLE) entscheiden("ja");
    else if (dx < -SCHWELLE) entscheiden("nein");
    else setZug({ x: 0, y: 0, aktiv: false });
  }

  const gemerkt = Object.values(urteile).filter((u) => u === "ja").length;
  const beurteilt = Object.keys(urteile).length;

  // Stellung der obersten Karte: beim Auslösen fliegt sie aus dem Bild
  const weg = flug ? (flug === "ja" ? 1 : -1) : 0;
  const x = flug ? weg * 620 : zug.x;
  const drehung = x / 22;
  const staerke = Math.min(Math.abs(zug.x) / SCHWELLE, 1);

  function alleZuruecksetzen() {
    try { window.localStorage.removeItem(SPEICHER); } catch { /* egal */ }
    setUrteile({});
    setMeldung("Alle Urteile zurückgesetzt.");
  }

  if (!geladen) {
    return <div className="h-[520px] animate-pulse rounded-2xl bg-white/5" aria-hidden="true" />;
  }

  return (
    <section aria-labelledby="swipe-titel" className="mx-auto w-full max-w-[440px]">
      <h2 id="swipe-titel" className="sr-only">
        Artikel durchwischen
      </h2>

      {/* Zählerzeile */}
      <div className="mb-4 flex items-center justify-between text-[12px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
        <span>
          {stapel.length > 0
            ? `Noch ${stapel.length} von ${frische.length}`
            : "Durch"}
        </span>
        <span className="text-cyan">{gemerkt} gemerkt</span>
      </div>

      {/* Der Stapel */}
      <div className="relative h-[520px] select-none">
        {stapel.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border-2 border-white/12 bg-white/[0.03] px-6 text-center">
            <p className="text-[20px] font-black leading-tight text-white">
              Alles durchgesehen.
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-text-secondary">
              {beurteilt} Artikel beurteilt, {gemerkt} davon gemerkt. Neue Meldungen
              landen automatisch hier.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="rounded-full bg-cyan px-5 py-2.5 text-[14px] font-bold text-navy"
              >
                Zur Startseite
              </Link>
              <button
                type="button"
                onClick={alleZuruecksetzen}
                className="rounded-full border border-white/20 px-5 py-2.5 text-[14px] font-semibold text-white hover:border-cyan hover:text-cyan"
              >
                Von vorn beginnen
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Karte darunter - gibt dem Stapel Tiefe */}
            {darunter && (
              <div
                key={darunter.slug}
                aria-hidden="true"
                className="absolute inset-0 scale-[0.94] rounded-2xl border-2 border-white/10 bg-navy opacity-60"
                style={{ transform: "scale(0.94) translateY(14px)" }}
              >
                <div className="relative h-[62%] overflow-hidden rounded-t-xl">
                  <Image
                    src={darunter.image.src}
                    alt=""
                    fill
                    sizes="440px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Oberste Karte */}
            <div
              ref={karteRef}
              onPointerDown={zeigerStart}
              onPointerMove={zeigerZug}
              onPointerUp={zeigerEnde}
              onPointerCancel={zeigerEnde}
              className="absolute inset-0 cursor-grab touch-none overflow-hidden rounded-2xl border-2 border-cyan bg-navy active:cursor-grabbing"
              style={{
                transform: `translate(${x}px, ${flug ? -60 : zug.y}px) rotate(${drehung}deg)`,
                transition: zug.aktiv && !flug ? "none" : "transform .26s cubic-bezier(.22,1,.36,1)",
                opacity: flug ? 0 : 1,
              }}
            >
              <div className="relative h-[62%] overflow-hidden">
                <Image
                  src={oben.image.src}
                  alt=""
                  fill
                  sizes="440px"
                  priority
                  className="object-cover"
                />
                {/* Urteilsstempel, erscheinen beim Ziehen */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-4 rotate-[-14deg] rounded-lg border-4 border-cyan px-3 py-1 text-[22px] font-black uppercase tracking-tight text-cyan"
                  style={{ opacity: zug.x > 24 ? staerke : 0 }}
                >
                  Interessiert
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-4 rotate-[14deg] rounded-lg border-4 border-[#FF4D6D] px-3 py-1 text-[22px] font-black uppercase tracking-tight text-[#FF4D6D]"
                  style={{ opacity: zug.x < -24 ? staerke : 0 }}
                >
                  Nein
                </span>
              </div>

              <div className="flex h-[38%] flex-col justify-between p-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan">
                    {oben.tags[0] ?? oben.category}
                  </p>
                  <p className="mt-2 line-clamp-3 text-[19px] font-black leading-[1.2] text-white">
                    {oben.title}
                  </p>
                </div>
                <Link
                  href={`/artikel/${oben.slug}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="self-start text-[12px] font-semibold uppercase tracking-[0.1em] text-text-secondary underline-offset-4 hover:text-cyan hover:underline"
                >
                  Ganzen Artikel lesen →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Knöpfe - die Bedienung für alle, die nicht wischen */}
      {stapel.length > 0 && (
        <div className="mt-5 flex items-center justify-center gap-5">
          <button
            type="button"
            onClick={() => entscheiden("nein")}
            aria-label="Interessiert mich nicht"
            className="grid h-16 w-16 place-items-center rounded-full border-2 border-[#FF4D6D] text-[26px] text-[#FF4D6D] transition hover:bg-[#FF4D6D] hover:text-navy"
          >
            ✕
          </button>
          <p className="text-center text-[11px] uppercase tracking-[0.12em] text-text-secondary">
            Wischen<br />oder Pfeiltasten
          </p>
          <button
            type="button"
            onClick={() => entscheiden("ja")}
            aria-label="Interessiert mich"
            className="grid h-16 w-16 place-items-center rounded-full border-2 border-cyan text-[26px] text-cyan transition hover:bg-cyan hover:text-navy"
          >
            ♥
          </button>
        </div>
      )}

      {/* Rückmeldung für Vorleseprogramme */}
      <p aria-live="polite" className="sr-only">
        {meldung}
      </p>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-text-secondary">
        {session
          ? "Gemerkte Themen landen auf deiner Merkliste und folgen dir aufs andere Gerät."
          : "Ohne Konto bleibt deine Auswahl nur auf diesem Gerät. Mit Konto folgt sie dir überall hin."}
      </p>
    </section>
  );
}
