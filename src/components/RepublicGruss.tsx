// Hero-Gruss, Fassung "Punkt-Statement mit Wappen" (Tim-Freigabe
// 22.08.2026, Deploy folgt auf sein Kommando): das Pixel-R als Wappen
// links, gesperrte Cyan-Zeile, REPUBLIC mit Magenta-Punkt. Drei
// Markenzeichen in einer ruhigen Geste.
export function RepublicGruss() {
  return (
    <div className="mb-[42px] flex items-center gap-4 sm:mb-[52px] sm:gap-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/r-mark.png"
        alt=""
        aria-hidden="true"
        className="h-[52px] w-auto sm:h-[70px] lg:h-[84px]"
      />
      <h2 className="leading-none">
        <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.28em] text-accent sm:mb-2.5 sm:text-[14px]">
          Willkommen in der
        </span>
        {/* text-shadow:none - die globale h2-Regel wuerde sonst den
            Farbversatz auflegen; dieser Gruss ist bewusst ruhig. */}
        <span className="block text-[34px] font-black uppercase leading-[0.95] tracking-[-0.5px] text-[#F2F8FF] [text-shadow:none] sm:text-[50px] lg:text-[64px]">
          Republic<span className="text-magenta">.</span>
        </span>
      </h2>
    </div>
  );
}
