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
      let visitor = localStorage.getItem("rop_vid");
      if (!visitor) {
        visitor = crypto.randomUUID();
        localStorage.setItem("rop_vid", visitor);
      }
      getSupabase()
        .from("page_views")
        .insert({ path: pathname.slice(0, 300), visitor })
        .then(() => {});
    } catch {
      // Tracking darf nie die Seite stören (z. B. Tabelle noch nicht angelegt)
    }
  }, [pathname]);

  return null;
}
