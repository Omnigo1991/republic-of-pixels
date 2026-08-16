import { PlatformIcon } from "./PlatformIcons";
import { SectionDivider } from "./SectionDivider";
import dealsData from "@/content/deals.json";

interface Deal {
  appId: number;
  title: string;
  discountPercent: number;
  originalPrice: number;
  finalPrice: number;
  currency: string;
  endsAt: string | null;
  url: string;
  image: string | null;
}

// Deal-Radar: aktuelle Steam-Angebote (EUR), von der Pipeline im
// 3-Stunden-Takt via pipeline/deals.mjs aktualisiert. Bewusst als
// "PC-Deals via Steam" gekennzeichnet — für PSN/eShop/Xbox gibt es
// keine sauberen freien Preis-APIs. Aufbau analog Release-Radar:
// Cyan-Badge (Rabatt statt Datum), Titel, Streichpreis, Restlaufzeit.
export function DealRadar() {
  const deals = (dealsData.deals as Deal[]) ?? [];
  if (deals.length === 0) return null;

  const preis = (cents: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

  const restlaufzeit = (iso: string | null) => {
    if (!iso) return null;
    const tage = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
    if (tage < 0) return null;
    if (tage <= 1) return "endet heute";
    return `endet in ${tage} Tagen`;
  };

  return (
    <section aria-labelledby="deals-heading" className="py-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="deals-heading" className="text-[24px] font-black tracking-tight text-text-primary sm:text-[28px]">
          Deal-Radar
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <PlatformIcon platform="pc" className="h-3.5 w-3.5" />
          PC-Angebote auf Steam
        </span>
      </div>
      <SectionDivider />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {deals.map((d) => {
          const ende = restlaufzeit(d.endsAt);
          return (
            <a
              key={d.appId}
              href={d.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex h-full min-w-0 items-center gap-4 rounded-2xl border border-border-subtle bg-surface-card p-4 transition-all duration-300 hover:bg-surface-hover"
            >
              {d.image ? (
                <div className="relative h-14 w-28 shrink-0 overflow-hidden rounded-lg border border-border-subtle">
                  {/* Steam-Kapselbild vom offiziellen CDN (kein Cookie, kein Skript) —
                      bewusst plain <img>, damit keine CDN-Domain in der
                      next/image-Allowlist gepflegt werden muss. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={d.image}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent">
                  <span className="text-[15px] font-bold leading-none text-[#0F0D2C]">
                    −{d.discountPercent}%
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {d.title}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#0F0D2C]">
                    −{d.discountPercent}%
                  </span>
                  <span className="text-xs text-text-disabled line-through">{preis(d.originalPrice)}</span>
                  <span className="text-sm font-semibold text-text-primary">{preis(d.finalPrice)}</span>
                </div>
                {ende && <p className="mt-0.5 text-[11px] text-text-tertiary">{ende}</p>}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
