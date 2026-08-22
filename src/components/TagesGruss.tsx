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
    const aktualisieren = () => {
      // formatToParts statt format: format() liefert auf Deutsch
      // "8 Uhr" - und Number("8 Uhr") ist NaN, womit jede Uhrzeit
      // auf den Abend-Zweig fiel (Tims Fund am 23.08.2026 morgens).
      const teil = new Intl.DateTimeFormat("de-CH", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: "Europe/Zurich",
      })
        .formatToParts(new Date())
        .find((p) => p.type === "hour");
      const stunde = Number(teil?.value ?? NaN);
      // Wenn selbst das schiefgeht, lieber neutral "Guten Tag" als
      // ein falscher Abendgruss am Morgen.
      setGruss(Number.isNaN(stunde) ? "Guten Tag," : grussZurStunde(stunde));
    };
    aktualisieren();
    // Nicht nur einmal rechnen (Tim, 23.08.2026): Safari und Chrome
    // stellen Tabs aus dem Speicher wieder her - wer den Tab vom
    // Vorabend am Morgen öffnet, sah sonst weiter "Guten Abend".
    // Deshalb neu rechnen, sobald die Seite wieder sichtbar wird,
    // und zur Sicherheit alle zehn Minuten.
    const takt = window.setInterval(aktualisieren, 10 * 60 * 1000);
    document.addEventListener("visibilitychange", aktualisieren);
    window.addEventListener("pageshow", aktualisieren);
    window.addEventListener("focus", aktualisieren);
    return () => {
      window.clearInterval(takt);
      document.removeEventListener("visibilitychange", aktualisieren);
      window.removeEventListener("pageshow", aktualisieren);
      window.removeEventListener("focus", aktualisieren);
    };
  }, []);

  return <SektionsBanner titel={gruss} cyan="Republic" className="mb-[42px] sm:mb-[52px]" />;
}
