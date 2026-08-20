"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { AnmeldeDialog } from "@/components/AuthDialog";
import { getSupabase } from "@/lib/supabase";

// /profil ohne Namen: Ziel des "Anmelden"-Knopfs im Mobile-Menue.
// Der Knopf zeigte bis 20.08.2026 auf diese Adresse, die Seite gab es
// aber nie - am Handy endete jeder Anmeldeversuch auf der 404.
// Angemeldete werden zu ihrem Profil weitergeleitet (bzw. zu den
// Einstellungen, solange noch kein Nickname gesetzt ist), alle anderen
// sehen direkt den Anmelde-Dialog.
export default function ProfilWeiche() {
  const supabase = useMemo(() => getSupabase(), []);
  const router = useRouter();
  const [status, setStatus] = useState<"laedt" | "dialog">("laedt");

  useEffect(() => {
    let aktiv = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!aktiv) return;
      const user = data.session?.user;
      if (!user) {
        setStatus("dialog");
        return;
      }
      const { data: profil } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .maybeSingle();
      if (!aktiv) return;
      const nickname = (profil as { nickname?: string } | null)?.nickname;
      router.replace(nickname ? `/profil/${encodeURIComponent(nickname)}` : "/einstellungen");
    })();
    return () => {
      aktiv = false;
    };
  }, [supabase, router]);

  return (
    <>
      <Masthead />
      <div className="mx-auto max-w-content px-4 py-16 text-center text-sm text-text-tertiary sm:px-6">
        {status === "laedt" && <p>Einen Moment …</p>}
      </div>
      {status === "dialog" && (
        <AnmeldeDialog onSchliessen={() => router.replace("/")} />
      )}
    </>
  );
}
