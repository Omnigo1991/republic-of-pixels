import Link from "next/link";
import type { Article } from "@/lib/types";
import { PlaceholderArt } from "@/components/PlaceholderArt";
import { CHIP, VERLAUFSTEXT, KategorieChip, punktFarbe, labelFarbe, spielName } from "./Bausteine";

// Kino-Hero (Tim-Freigabe 22.08.2026, Variante HC): Der Aufmacher füllt
// die Bühne, Titel und Anriss stehen im Bild, darunter schweben drei
// weitere Meldungen als Glaskarten. Am Handy flacher, damit das Bild
// weniger stark herangezoomt wird.
export function KinoHero({ artikel, weitere }: { artikel: Article; weitere: Article[] }) {
  return (
    <div className="hero-voll schrift-normal relative h-[540px] sm:h-[760px] lg:h-[960px]">
      {artikel.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artikel.image.src}
          alt={artikel.image.alt}
          className="absolute inset-0 h-full w-full object-cover object-[center_42%]"
        />
      ) : (
        <span className="absolute inset-0">
          <PlaceholderArt variant={artikel.heroVariant} />
        </span>
      )}
      {/* Der Verlauf endet im Seitengrund - kein harter Schnitt. */}
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.5)_0%,rgba(0,0,0,0.06)_26%,rgba(6,6,16,0.62)_62%,rgba(9,8,20,0.92)_84%,#0C0B1A_99%)]" />

      <div className="absolute inset-x-0 bottom-4 z-[5] sm:bottom-11 lg:bottom-16">
        <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
          <span
            className={`${CHIP} inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white`}
          >
            <span
              className="h-[7px] w-[7px] rounded-full"
              style={{ background: punktFarbe(artikel) }}
            />
            {spielName(artikel)}
          </span>
          <h1
            className={`${VERLAUFSTEXT} mt-3.5 max-w-[780px] pb-1.5 text-[26px] font-bold leading-[1.08] tracking-[-0.015em] sm:mt-4 sm:text-[44px] lg:text-[64px]`}
          >
            {artikel.title}
          </h1>
          {/* Am Handy führt der Titel allein - der Anriss wartet im Artikel. */}
          <p className="mt-3.5 hidden max-w-[620px] text-[20px] leading-[1.4] text-white/[0.78] sm:block">
            {artikel.excerpt}
          </p>
          <div className="mt-3.5 sm:mt-6">
            <Link
              href={`/artikel/${artikel.slug}`}
              className="inline-block rounded-full bg-white px-6 py-3 text-[15px] font-semibold text-[#0C0B1A] sm:text-base"
            >
              Artikel lesen
            </Link>
          </div>

          {/* Drei weitere Meldungen, am Handy seitlich wischbar. */}
          <div className="mt-3.5 flex gap-3.5 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mt-7 [&::-webkit-scrollbar]:hidden">
            {weitere.map((a) => (
              <Link
                key={a.slug}
                href={`/artikel/${a.slug}`}
                className={`${CHIP} w-[74%] shrink-0 rounded-[18px] p-3.5 sm:w-auto sm:flex-1 sm:p-4`}
              >
                <span
                  className="block text-[10px] font-bold uppercase tracking-[0.07em]"
                  style={{ color: labelFarbe(a) }}
                >
                  {spielName(a)}
                </span>
                <span className="mt-1.5 block text-[13.5px] font-semibold leading-[1.3] text-white">
                  {a.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** "Beliebt bei Lesern" als Slider - Rangnummer als dezenter Glaskreis. */
export function BeliebtSlider({ artikel }: { artikel: Article[] }) {
  if (!artikel.length) return null;
  return (
    <div className="schrift-normal mx-auto mt-11 max-w-content px-4 sm:px-6 lg:px-8">
      <h2 className="mb-4 text-[20px] font-bold text-[#F2F8FF] sm:text-[24px]">
        Beliebt bei Lesern
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {artikel.map((a, i) => (
          <Link
            key={a.slug}
            href={`/artikel/${a.slug}`}
            className="relative flex h-[186px] w-[78%] shrink-0 items-end overflow-hidden rounded-[20px] sm:w-[268px]"
          >
            {a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.image.src} alt={a.image.alt} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-0">
                <PlaceholderArt variant={a.heroVariant} />
              </span>
            )}
            <span className="absolute inset-0 bg-[linear-gradient(200deg,rgba(0,0,0,0)_22%,rgba(0,0,0,0.9)_92%)]" />
            <span
              className={`${CHIP} absolute left-3 top-3 grid h-[26px] w-[26px] place-items-center rounded-full text-[12.5px] font-bold leading-none text-white [font-variant-numeric:tabular-nums] [text-indent:0.5px]`}
            >
              {i + 1}
            </span>
            <span className="relative p-4">
              <span className="block text-[15px] font-bold leading-[1.25] text-white">{a.title}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { KategorieChip };
