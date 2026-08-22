import type { Metadata } from "next";
import { SwipeStapel } from "@/components/SwipeStapel";

// Eigene Adresse /entdecken, weil sich Adressen später nicht mehr ändern
// lassen, ohne bei Google von vorn anzufangen - dieselbe Überlegung wie
// bei /guides.

export const metadata: Metadata = {
  title: "Entdecken",
  description:
    "Wisch dich durch die neuesten Meldungen: rechts für interessiert, links für nicht. Gemerkte Themen landen auf deiner Merkliste.",
};

export default function EntdeckenSeite() {
  return (
    <>
      <main className="mx-auto max-w-[1280px] px-4 pb-20 pt-8 sm:px-6">
        <header className="mx-auto mb-8 max-w-[560px] text-center">
          <h1 className="text-[30px] font-black leading-[1.08] tracking-tight text-text-primary sm:text-[38px]">
            Entdecken
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-text-secondary">
            Nach rechts, was dich interessiert. Nach links, was nicht. Wir merken
            uns die Themen und zeigen dir künftig mehr davon.
          </p>
        </header>

        <SwipeStapel />
      </main>
    </>
  );
}
