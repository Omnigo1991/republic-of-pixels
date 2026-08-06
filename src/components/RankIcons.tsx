export type RankIconKey = "spark" | "gamepad" | "shield" | "medal" | "crown";

// Rang-Icons als einfache, gefüllte Glyphen im Stil von PlatformIcon/BoltIcon
// (viewBox 24×24, fill=currentColor) — ersetzt die anfangs verwendeten Emojis,
// die auf der übrigen Seite nirgends vorkommen (Betreiber-Feedback: "richtige
// Icons in Cyan" statt Emoji). Verlauf spark → gamepad → shield → medal →
// crown bildet den steigenden Rang bildlich ab.
const PATHS: Record<RankIconKey, string> = {
  spark: "M12 4l1.8 6.2L20 12l-6.2 1.8L12 20l-1.8-6.2L4 12l6.2-1.8L12 4z",
  gamepad:
    "M7 6h10a5 5 0 0 1 0 10c-.9 0-1.7-.4-2.3-1l-.7-.7h-4l-.7.7c-.6.6-1.4 1-2.3 1a5 5 0 0 1 0-10zm-.5 2.5V10H5v1.5h1.5V13H8v-1.5h1.5V10H8V8.5H6.5zM16 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-2-3a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  shield: "M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3z",
  medal: "M12 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM9.5 13.5L7 21l4-4zM14.5 13.5L17 21l-4-4z",
  crown: "M4 15l3-10 5 5 5-5 3 10H4z M4 17h16v2H4v-2z",
};

// Jede Glyphe hat von Natur aus eine andere Tinten-Bounding-Box (Schild z. B.
// 16×20px, Gamepad 20×10px, Medaille 10×17px — per SVG getBBox() gemessen,
// Betreiber-Feedback: "Schild wirkt grösser"). transform normalisiert jede
// Glyphe auf dieselbe maximale Ausdehnung (16px) um ihr eigenes Zentrum, damit
// alle optisch gleich gross wirken statt nur dieselbe viewBox zu teilen.
const TRANSFORMS: Partial<Record<RankIconKey, string>> = {
  gamepad: "translate(12,12) scale(0.8) translate(-12,-11)",
  shield: "translate(12,12) scale(0.8) translate(-12,-12)",
  medal: "translate(12,12) scale(0.941) translate(-12,-12.5)",
};

export function RankIcon({ iconKey, className }: { iconKey: RankIconKey; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <g transform={TRANSFORMS[iconKey]}>
        <path d={PATHS[iconKey]} />
      </g>
    </svg>
  );
}
