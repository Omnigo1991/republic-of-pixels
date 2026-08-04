import Link from "next/link";

// Vektor-Rekonstruktion des Republic-of-Pixels-Markenzeichens: aus dem Original-Logo
// per Pixel-Raster-Analyse extrahiert (64x64-Grid, siehe docs/konzept.md), damit das
// Zeichen verlustfrei skaliert und keine Rasterbild-Ladezeit kostet.
function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 232"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <rect x="32" y="0" width="104" height="8" />
      <rect x="32" y="8" width="104" height="8" />
      <rect x="32" y="16" width="104" height="8" />
      <rect x="32" y="24" width="112" height="8" />
      <rect x="0" y="32" width="168" height="8" />
      <rect x="0" y="40" width="168" height="8" />
      <rect x="0" y="48" width="56" height="8" />
      <rect x="112" y="48" width="56" height="8" />
      <rect x="0" y="56" width="56" height="8" />
      <rect x="112" y="56" width="56" height="8" />
      <rect x="0" y="64" width="56" height="8" />
      <rect x="112" y="64" width="56" height="8" />
      <rect x="0" y="72" width="56" height="8" />
      <rect x="112" y="72" width="56" height="8" />
      <rect x="0" y="80" width="56" height="8" />
      <rect x="112" y="80" width="56" height="8" />
      <rect x="0" y="88" width="56" height="8" />
      <rect x="112" y="88" width="56" height="8" />
      <rect x="0" y="96" width="56" height="8" />
      <rect x="112" y="96" width="56" height="8" />
      <rect x="0" y="104" width="56" height="8" />
      <rect x="112" y="104" width="56" height="8" />
      <rect x="0" y="112" width="168" height="8" />
      <rect x="0" y="120" width="136" height="8" />
      <rect x="0" y="128" width="136" height="8" />
      <rect x="0" y="136" width="136" height="8" />
      <rect x="0" y="144" width="56" height="8" />
      <rect x="88" y="144" width="64" height="8" />
      <rect x="0" y="152" width="56" height="8" />
      <rect x="88" y="152" width="64" height="8" />
      <rect x="0" y="160" width="56" height="8" />
      <rect x="112" y="160" width="48" height="8" />
      <rect x="0" y="168" width="56" height="8" />
      <rect x="112" y="168" width="56" height="8" />
      <rect x="0" y="176" width="56" height="8" />
      <rect x="112" y="176" width="56" height="8" />
      <rect x="0" y="184" width="56" height="8" />
      <rect x="120" y="184" width="40" height="8" />
      <rect x="176" y="184" width="8" height="8" />
      <rect x="0" y="192" width="56" height="8" />
      <rect x="136" y="192" width="16" height="8" />
      <rect x="160" y="192" width="8" height="8" />
      <rect x="176" y="192" width="8" height="8" />
      <rect x="0" y="200" width="56" height="8" />
      <rect x="144" y="200" width="16" height="8" />
      <rect x="32" y="208" width="24" height="8" />
      <rect x="152" y="208" width="8" height="8" />
      <rect x="176" y="208" width="8" height="8" />
      <rect x="32" y="216" width="24" height="8" />
      <rect x="160" y="216" width="8" height="8" />
      <rect x="32" y="224" width="24" height="8" />
      <rect x="192" y="224" width="8" height="8" />
    </svg>
  );
}

export function Logo({
  withWordmark = true,
  size = "md",
}: {
  withWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const markSize = size === "lg" ? "h-9 w-auto" : size === "sm" ? "h-6 w-auto" : "h-7 w-auto";
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 shrink-0 group"
      aria-label="Republic of Pixels – Startseite"
    >
      <Mark className={`${markSize} text-accent transition-transform duration-300 group-hover:scale-105`} />
      {withWordmark && (
        <span className="font-sans font-semibold tracking-tight text-text-primary leading-none">
          <span className="block text-[15px] sm:text-[16px]">Republic</span>
          <span className="block text-[10px] sm:text-[11px] text-text-tertiary tracking-[0.2em] -mt-0.5">
            OF PIXELS
          </span>
        </span>
      )}
    </Link>
  );
}

export { Mark as LogoMark };
