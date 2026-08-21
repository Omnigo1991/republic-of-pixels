"use client";

import { useEffect, useState } from "react";
import { SektionsBanner } from "./SektionsBanner";

// Hero-Gruss V2 (Tim-Freigabe 22.08.2026): "Guten Tag, Republic" im
// selben Schriftbild wie alle Sektionstitel (SektionsBanner), ohne
// Punkt, "Republic" in Cyan. Der Gruss folgt der Tageszeit.
//
// Erst nach dem Aufbau umschalten: Der Server kennt die Uhrzeit des
// Lesers nicht zuverlässig (statische Seiten tragen die Bauzeit).
// Deshalb startet die Zeile neutral mit "Guten Tag," und stellt sich
// im Browser auf Morgen/Abend um - einmalig, ohne sichtbares Springen,
// weil sich nur der Text austauscht, nicht die Höhe.
function grussZurStunde(stunde: number): string {
  if (stunde >= 5 && stunde < 11) return "Guten Morgen,";
  if (stunde >= 11 && stunde < 18) return "Guten Tag,";
  return "Guten Abend,";
}

export function TagesGruss() {
  const [gruss, setGruss] = useState("Guten Tag,");

  useEffect(() => {
    const stunde = Number(
      new Intl.DateTimeFormat("de-CH", {
        hour: "numeric",
        hour12: false,
        timeZone: "Europe/Zurich",
      }).format(new Date())
    );
    setGruss(grussZurStunde(stunde));
  }, []);

  return <SektionsBanner titel={gruss} cyan="Republic" className="mb-[42px] sm:mb-[52px]" />;
}
