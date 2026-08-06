import { MastheadNav } from "./MastheadNav";
import { BreakingTicker } from "./BreakingTicker";

// Header-Endstand (Betreiber-Entscheidung 05.08.2026 abends): IMMER exakt die
// schlanke Cyan-Leiste (ehemaliger "Scroll-Header") — auf allen Seiten, sticky.
// Das grosse Verge-Masthead (Wasserzeichen + grosses R/Sektionswort) ist
// bewusst abgelöst; die variant-/word-Props bleiben für API-Kompatibilität.
export function Masthead({
  variant: _variant = "slim",
  word: _word,
}: {
  variant?: "brand" | "section" | "slim";
  word?: string;
}) {
  return (
    <>
      <div className="sticky top-0 z-50 bg-accent text-[#0F0D2C]">
        <MastheadNav withMark />
      </div>
      <BreakingTicker />
    </>
  );
}
