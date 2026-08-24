"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

// Cookieloses Seitenaufruf-Tracking für das Redaktions-Cockpit:
// pro Seitenwechsel ein anonymer Eintrag (zufällige Besucher-ID im
// localStorage, keine personenbezogenen Daten, keine Cookies).
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      // Eigene Aufrufe verfälschen die Statistik nicht (Tim, 07.08.2026):
      // - localhost = Entwicklung/Previews → nie zählen
      // - rop_intern = Redaktionsgerät (wird beim Öffnen des Statistik-
      //   Cockpits gesetzt) → nie zählen
      // NUR DIE ECHTE DOMAIN ZAEHLT (Fund 16.08.2026): Bisher wurde nur
      // "localhost" ausgenommen - Vercel-Vorschauen (*.vercel.app) liefen
      // damit voll in die Statistik. Beim Redesign-Zweig hat allein die
      // automatische Screenshot-Pruefung die Vorschau dutzendfach
      // geladen, jedes Mal mit frischem Browser und damit neuer
      // Besucher-Kennung. Das hat die Zahlen aufgeblaeht.
      if (location.hostname !== "www.republicofpixels.com") return;
      if (localStorage.getItem("rop_intern")) return;
      // KEINE AUTOMATISIERTEN BROWSER (Tim, 24.08.2026). Die Lücke von
      // 16.08. war nur die halbe Miete: Sie schloss Vorschau-Adressen aus,
      // nicht aber Prüfläufe gegen die ECHTE Domain. Am 24.08. habe ich
      // beim Browser-Vergleich (Chrome gegen Safari, Desktop und Handy)
      // www.republicofpixels.com viermal mit frisch gestarteten Browsern
      // geladen - jeder mit leerem localStorage und damit neuer
      // Besucher-Kennung. Vier Phantom-Besucher an einem Tag mit 85.
      //
      // navigator.webdriver ist true in jedem ferngesteuerten Browser
      // (Playwright, Selenium, Puppeteer) und false bei echten Menschen -
      // das Merkmal ist Teil des W3C-Standards und lässt sich nicht
      // versehentlich auslösen.
      if (navigator.webdriver) return;
      let visitor = localStorage.getItem("rop_vid");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("rop_vid", visitor);
      }
      // Herkunft (Tim-Wunsch 08.08.2026): externer Referrer wird mitgespeichert
      // (nur die Quelle, keine Personendaten) - Grundlage der "Herkunft"-
      // Sektion im Cockpit. Interne Navigation zählt nicht als Quelle.
      const referrer =
        document.referrer && !document.referrer.includes(location.hostname)
          ? document.referrer.slice(0, 300)
          : null;
      getSupabase()
        .from("page_views")
        .insert({ path: pathname.slice(0, 300), visitor, referrer })
        .then(() => {});
    } catch {
      // Tracking darf nie die Seite stören (z. B. Tabelle noch nicht angelegt)
    }
  }, [pathname]);

  return null;
}
