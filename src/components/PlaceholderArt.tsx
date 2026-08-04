import type { HeroVariant } from "@/lib/types";

// Code-generierte Editorial-Grafiken statt Stockfotos/Screenshots: dunkler Navy-Gradient
// + eines von fünf abstrakten, akzentfarbenen Mustern. Keine Rechteproblematik, keine
// Bild-Ladezeit, unendlich skalierbar, pro Kategorie unterscheidbar (siehe docs/konzept.md §13).

function Circuit() {
  return (
    <g stroke="#02F0D1" strokeWidth="1.5" fill="none" opacity="0.55">
      <path d="M40 260 H160 V180 H320" />
      <path d="M40 320 H220 V380 H520" />
      <path d="M600 60 V160 H460 V240" />
      <path d="M700 300 H540 V220" />
      <path d="M120 60 V120 H260" />
      <circle cx="320" cy="180" r="5" fill="#02F0D1" stroke="none" />
      <circle cx="520" cy="380" r="5" fill="#02F0D1" stroke="none" />
      <circle cx="460" cy="240" r="5" fill="#02F0D1" stroke="none" />
      <circle cx="260" cy="120" r="5" fill="#02F0D1" stroke="none" />
      <circle cx="540" cy="220" r="5" fill="#02F0D1" stroke="none" />
      <path d="M660 380 H760" />
      <path d="M60 400 V440" />
    </g>
  );
}

function Controller() {
  return (
    <g stroke="#02F0D1" strokeWidth="2" fill="none" opacity="0.5">
      <path d="M260 190 h280 a70 70 0 0 1 68 84 l-14 96 a48 48 0 0 1 -86 24 l-30 -40 h-176 l-30 40 a48 48 0 0 1 -86 -24 l-14 -96 a70 70 0 0 1 68 -84 z" />
      <circle cx="340" cy="250" r="22" />
      <path d="M340 232 v36 M322 250 h36" strokeWidth="1.5" opacity="0.8" />
      <circle cx="560" cy="270" r="14" />
      <circle cx="600" cy="230" r="14" />
      <circle cx="520" cy="230" r="14" />
      <circle cx="560" cy="190" r="14" />
    </g>
  );
}

function Particles() {
  const dots = [
    [80, 80, 10], [140, 60, 6], [180, 120, 14], [90, 160, 6],
    [640, 90, 12], [700, 140, 6], [660, 200, 8], [720, 60, 5],
    [400, 340, 8], [440, 380, 5], [470, 410, 6], [500, 350, 5],
    [230, 300, 6], [260, 260, 9], [300, 330, 5],
    [560, 340, 7], [600, 380, 5], [540, 400, 4],
  ];
  return (
    <g fill="#02F0D1">
      {dots.map(([cx, cy, r], i) => (
        <rect key={i} x={cx - r / 2} y={cy - r / 2} width={r} height={r} opacity={0.25 + (i % 4) * 0.15} />
      ))}
    </g>
  );
}

function Waveform() {
  const heights = [40, 70, 30, 90, 50, 110, 60, 130, 45, 100, 35, 80, 55, 95, 40, 70, 30, 60, 45, 85];
  const barWidth = 800 / heights.length;
  return (
    <g fill="#02F0D1" opacity="0.5">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={i * barWidth + barWidth * 0.2}
          y={450 - h - 40}
          width={barWidth * 0.6}
          height={h}
          rx={2}
        />
      ))}
    </g>
  );
}

function Grid() {
  const lines = [];
  for (let i = -6; i <= 6; i++) {
    lines.push(
      <line key={`v${i}`} x1={400 + i * 90} y1="450" x2={400 + i * 18} y2="180" stroke="#02F0D1" strokeWidth="1" opacity="0.35" />
    );
  }
  for (let j = 0; j < 6; j++) {
    const y = 180 + j * j * 8;
    lines.push(<line key={`h${j}`} x1={0} y1={y} x2={800} y2={y} stroke="#02F0D1" strokeWidth="1" opacity="0.2" />);
  }
  return <g>{lines}</g>;
}

const VARIANTS: Record<HeroVariant, () => JSX.Element> = {
  circuit: Circuit,
  controller: Controller,
  particles: Particles,
  waveform: Waveform,
  grid: Grid,
};

export function PlaceholderArt({
  variant,
  className = "",
}: {
  variant: HeroVariant;
  className?: string;
}) {
  const Pattern = VARIANTS[variant] ?? Circuit;
  const gradientId = `rop-grad-${variant}`;
  const glowId = `rop-glow-${variant}`;
  return (
    <svg
      viewBox="0 0 800 450"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role="img"
      aria-label="Redaktionelle Editorial-Grafik"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#171533" />
          <stop offset="55%" stopColor="#0F0D2C" />
          <stop offset="100%" stopColor="#08071c" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#02F0D1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#02F0D1" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill={`url(#${gradientId})`} />
      <rect width="800" height="450" fill={`url(#${glowId})`} />
      <Pattern />
    </svg>
  );
}
