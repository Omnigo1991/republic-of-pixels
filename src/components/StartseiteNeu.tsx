import Link from "next/link";
import type { Article } from "@/lib/types";
import { ArticleMedia } from "./ArticleMedia";
import { splitTitle } from "@/lib/format";

// Bausteine der neuen hellen Startseite (Hell-Umbau 15.08.2026,
// abgenommener Polygon-Entwurf mit Pixel-Treppe). Alles Serverkomponenten -
// reine Darstellung, Daten kommen aus page.tsx.

// "VOR 2 STUNDEN" - die Zeitform der Neueste-Spalte. Ab 24 Stunden wird
// daraus ein Datum, damit nie "VOR 37 STUNDEN" dasteht.
export function relativeZeit(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const stunden = Math.floor(diffMs / 3600000);
  if (stunden < 1) return "GERADE EBEN";
  if (stunden === 1) return "VOR 1 STUNDE";
  if (stunden < 24) return `VOR ${stunden} STUNDEN`;
  const d = new Date(iso);
  return d.toLocaleDateString("de-CH", { day: "numeric", month: "long" }).toUpperCase();
}

export function NeuesteRail({ articles }: { articles: Article[] }) {
  return (
    <aside aria-label="Neueste Meldungen">
      <h2 className="mb-2 text-[24px] font-black tracking-tight text-text-primary sm:text-[28px]">Neueste</h2>
      <div>
        {articles.map((a, i) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className={`group grid grid-cols-[1fr_118px] gap-4 border-b border-border-subtle py-4 last:border-b-0 ${
              i > 2 ? "hidden lg:grid" : ""
            }`}
          >
            <div>
              <p className="mb-1.5 text-[12.5px] font-extrabold tracking-[0.06em] text-accent">
                {relativeZeit(a.publishedAt)}
              </p>
              <h3 className="text-[17px] font-extrabold leading-[1.32] text-text-primary group-hover:text-accent transition-colors">
                {a.title}
              </h3>
            </div>
            <div className="relative h-[76px] w-[118px] overflow-hidden rounded-lg">
              <ArticleMedia article={a} sizes="118px" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}

// EINE QUELLE FUER DEN KACHEL-UEBERGANG (Tim, 21.08.2026, "ein fuer
// alle Mal"): Verlauf und Textklassen liegen genau HIER und nirgendwo
// sonst. Jede Kachel mit Text im Bild (NotchKarte, Beliebt bei Lesern)
// importiert sie - damit koennen die Uebergaenge nie wieder
// auseinanderlaufen.
export const KACHEL_SCRIM_STIL = {
  background:
    "linear-gradient(0deg, #0F0E20 0px, #0F0E20 calc(100% - 76px), rgba(15,14,32,0.9) calc(100% - 64px), rgba(15,14,32,0.68) calc(100% - 48px), rgba(15,14,32,0.4) calc(100% - 32px), rgba(15,14,32,0.16) calc(100% - 16px), rgba(15,14,32,0) 100%)",
} as const;
export const KACHEL_SCRIM_KLASSE = "absolute inset-x-0 bottom-0 px-3.5 pb-3.5 pt-[76px]";
export const KACHEL_KICKER_KLASSE =
  "mb-1 text-[10px] font-extrabold tracking-[0.08em] text-accent line-clamp-1 sm:text-[11px]";
export const KACHEL_TITEL_KLASSE =
  "min-h-[3.9em] text-[13.5px] font-extrabold leading-[1.3] text-white line-clamp-3 sm:min-h-[2.6em] sm:text-[16px] sm:leading-[1.35] sm:line-clamp-2";

// Bildkarte mit Pixel-Treppe oben rechts: Artwork oben KOMPLETT
// unangetastet (Tim, 15.08.2026: "gar nicht abdunkeln"), Beschriftung auf
// eigener Navy-Zone darunter - die Standardkarte des neuen Looks.
export function NotchKarte({
  article,
  // AM HANDY DEUTLICH KLEINER ALS DER AUFMACHER (Tim, 20.08.2026): Mit
  // fester Hoehe von 280 px war das Bild praktisch so gross wie der
  // Aufmacher (300 px) - die zweite Meldung wirkte damit wichtiger als
  // die erste. 16:9 entspricht genau dem Seitenverhaeltnis unserer
  // Artikelbilder, es wird also zusaetzlich nichts weggeschnitten.
  bildHoehe = "aspect-[16/9] h-auto sm:aspect-auto sm:h-[280px]",
  randCyan = false,
}: {
  article: Article;
  bildHoehe?: string;
  /** Cyan-Rand statt Navy - bei den Guides (Tim, 17.08.2026). */
  randCyan?: boolean;
}) {
  const { kicker, headline } = splitTitle(article.title, article.tags);
  return (
    <Link href={`/artikel/${article.slug}`} className="group block h-full">
      <div className={`treppe-tr h-full ${randCyan ? "treppe-cyan" : ""}`}>
        <div className={`treppe-innen ${bildHoehe}`}>
          <div className="absolute inset-0 [&_img]:h-full [&_img]:w-full [&_img]:object-cover transition-transform duration-500 group-hover:scale-[1.03]">
            <ArticleMedia article={article} sizes="(max-width: 640px) 100vw, 320px" className="h-full w-full" />
          </div>
          {/* Polygon-Scrim (aus deren CSS): nur auf der Textbox, untere
              Haelfte flach 80%, obere Haelfte laeuft aus. */}
          {/* Uebergang wie vor der Analyserunde: 76 px weicher Auslauf.
              Die 36-px-Kurzfassung wirkte hart ("beschissen") - seit die
              Guides-Kacheln Trio-Groesse haben, passt die lange Fassung
              wieder ueberall. */}
          <div className={KACHEL_SCRIM_KLASSE} style={KACHEL_SCRIM_STIL}>
            {kicker && <p className={KACHEL_KICKER_KLASSE}>{kicker.toUpperCase()}</p>}
            {/* AM HANDY KLEINER UND DREIZEILIG (Tim, 20.08.2026): In zwei
                Spalten ist eine Karte nur rund 167 px breit. Mit 16 px
                Schrift und zwei Zeilen brach fast jede Schlagzeile mitten
                im Wort ab - auf der Startseite waren 19 Ueberschriften
                abgeschnitten. Ab sm bleibt alles wie bisher. */}
            {/* ZURUECK AUF DEN STAND VOR DER ANALYSERUNDE (Tim, 20.08.2026,
                "verschlimmbessert"): volle Schlagzeile samt Wendung, am
                Rechner exakt zwei Zeilen (min-h = clamp), lange Titel
                enden mit Punkten. Der Kern-ohne-Wendung-Versuch liess
                Einzeiler mit grosser Leerflaeche zurueck. */}
            <h3 className={KACHEL_TITEL_KLASSE}>{headline}</h3>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Cyan-Band mit den zwei wichtigsten Schlagzeilen - volle Breite.
export function TickerBand({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <div className="bg-accent">
      <div className="mx-auto grid max-w-content items-center gap-4 px-4 py-7 sm:px-6 lg:grid-cols-[200px_1fr_1fr] lg:gap-9 lg:px-8">
        <p className="text-[15px] font-black tracking-[0.12em] text-[#0F0D2C]">AUS DER REPUBLIC</p>
        {articles.slice(0, 2).map((a, i) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className={`text-[19px] font-black uppercase leading-[1.3] text-[#0F0D2C] hover:opacity-70 transition-opacity ${
              i === 1 ? "border-t-[3px] border-[#0F0D2C]/35 pt-4 lg:border-l-[3px] lg:border-t-0 lg:pl-9 lg:pt-0" : ""
            }`}
          >
            {a.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

// Cyan-Block (Navy-Umbau, Tim 17.08.2026 - vorher Navy, das ginge auf
// Navy-Grund unter). Der Versand existiert noch nicht - das Feld ist
// bewusst stillgelegt und sagt das ehrlich, statt Adressen ins Leere zu
// sammeln.
export function NewsletterBlock({ artikelBilder }: { artikelBilder: Article[] }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-accent">
      <div className="grid items-center gap-10 px-5 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1fr_400px] lg:px-14 lg:py-14">
        <div>
          {/* Schrift und Abstaende ueberarbeitet (Tim, 17.08.2026).
              Vorher trugen beide Zeilen dieselbe Groesse und unterschieden
              sich nur in der Deckkraft - das las sich wie ein Fehler statt
              wie eine Hervorhebung. Jetzt fuehrt eine kleine Versalzeile
              ein, die Aussage steht gross darunter, und die Abstaende
              folgen einer Stufenleiter (10 / 18 / 28 / 14) statt beliebiger
              Einzelwerte. */}
          <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-navy/70">
            Der Republic-Newsletter
          </p>
          <h2 className="mt-[10px] text-[30px] font-black leading-[1.08] tracking-[-0.02em] text-navy sm:text-[44px]">
            Keine Nebenquests.
            <br />
            Nur die besten News.
          </h2>
          <p className="mt-[18px] max-w-[46ch] text-[16px] leading-[1.55] text-navy/75 sm:text-[17px]">
            Einmal täglich in dein Postfach - Gaming-News, eingeordnet statt nur
            gemeldet.
          </p>
          <div className="mt-[28px] flex max-w-[520px] flex-col gap-3 sm:flex-row">
            <input
              placeholder="Newsletter startet bald"
              disabled
              aria-label="E-Mail-Adresse"
              className="min-w-0 flex-1 rounded-full border-2 border-navy/20 bg-white/70 px-5 py-3.5 text-[15px] text-navy placeholder:text-navy/45"
            />
            {/* Farbe als style, nicht als Klasse: Die Verlaufsflaeche
                (.bg-accent) zwingt jede text-accent-Schrift auf Dunkel -
                der Knopf war dunkle Schrift auf dunkler Pille, also
                unsichtbar. Ein Inline-Stil schlaegt diese Regel. */}
            <button
              disabled
              style={{ color: "#02F0D1" }}
              className="cursor-not-allowed rounded-full bg-[#0B0616] px-8 py-3.5 text-[15px] font-extrabold tracking-[0.01em] opacity-80"
            >
              Anmelden
            </button>
          </div>
        </div>
        {/* Polygon-Collage (Tim, 21.08.2026): festes Bild statt der zwei
            rotierenden Sticker - Master Chief, LEGO-Mario, GTA-6-Figur und
            Bond-Lucia, freigestellt aus unseren eigenen Pressebildern mit
            weisser Sticker-Kontur (public/brand/newsletter-collage.webp).
            Ragt bewusst leicht ueber die Panelkante, der Beschnitt kommt
            vom overflow-hidden des Blocks. */}
        <div className="relative hidden h-[300px] lg:flex items-center justify-end" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/newsletter-collage.webp"
            alt=""
            className="pointer-events-none -mr-8 -mt-10 h-[420px] w-auto max-w-none drop-shadow-[0_22px_40px_rgba(11,6,22,0.35)]"
          />
        </div>
      </div>
    </div>
  );
}

// Sektions-Kopf im neuen Look: fette Überschrift + MEHR-Pfeil + Hinweis.
export function SektionsKopf({
  titel,
  hinweis,
}: {
  titel: string;
  hinweis?: string;
}) {
  return (
    // Werte an der Live-Seite abgemessen (Tim, 17.08.2026): H2 20 px in
    // Gewicht 600, Hinweis 12 px in der leisen Textfarbe, Kopfzeile mit
    // 12 px Abstand nach unten und Grundlinien-Ausrichtung.
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-xl font-semibold tracking-tight text-text-primary">{titel}</h2>
      {hinweis && <span className="text-xs text-text-tertiary">{hinweis}</span>}
    </div>
  );
}

// "Mehr anzeigen" als Pille unter der Sektion - EIN Muster fuer alle
// Sektionen (Tim, 15.08.2026): kein Mini-Link mehr neben der Ueberschrift.
export function MehrPille({ href, text = "Mehr anzeigen" }: { href: string; text?: string }) {
  return (
    <div className="mt-8 flex justify-center">
      <Link
        href={href}
        className="rounded-full border border-accent/50 px-6 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
      >
        {text}
      </Link>
    </div>
  );
}
