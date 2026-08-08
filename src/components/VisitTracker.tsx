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
      if (location.hostname === "localhost") return;
      if (localStorage.getItem("rop_intern")) return;
      let visitor = localStorage.getItem("rop_vid");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("rop_vid", visitor);
      }
      // Herkunft (Tim-Wunsch 08.08.2026): externer Referrer wird mitgespeichert
      // (nur die Quelle, keine Personendaten) — Grundlage der "Herkunft"-
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
