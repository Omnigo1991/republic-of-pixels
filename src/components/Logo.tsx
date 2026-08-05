import Link from "next/link";

// Das R-Markenzeichen wird direkt aus der Original-Logodatei verwendet
// (public/brand/r-mark.png, extrahiert aus "Logo-Vorlage (2).png" mit
// transparentem Hintergrund) — exakt das Original, keine Rekonstruktion,
// keine Artefakte (Betreiber-Vorgabe 05.08.2026).
// Seitenverhältnis der Datei: 401×464.
export function LogoMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/brand/r-mark.png"
      alt=""
      aria-hidden="true"
      className={className}
      draggable={false}
    />
  );
}

export function Logo({
  withWordmark = true,
  size = "md",
}: {
  withWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const markSize = size === "lg" ? "h-10 w-auto" : size === "sm" ? "h-7 w-auto" : "h-9 w-auto";
  return (
    <Link
      href="/"
      className="flex items-center gap-3 shrink-0 group"
      aria-label="Republic of Pixels – Startseite"
    >
      <LogoMark className={`${markSize} transition-transform duration-300 group-hover:scale-105`} />
      {withWordmark && (
        // Wortmarke in der Site-Schrift (Space Grotesk) — eine Schrift überall.
        <span className="font-display font-bold leading-none">
          <span className="block text-[16px] sm:text-[17px] tracking-tight text-text-primary">
            REPUBLIC
          </span>
          <span className="block text-[10px] sm:text-[11px] text-accent-brand tracking-[0.3em] mt-1">
            OF PIXELS
          </span>
        </span>
      )}
    </Link>
  );
}
