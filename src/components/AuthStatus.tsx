"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, type Profil } from "@/lib/supabase";
import { AnmeldeDialog } from "./AuthDialog";

// Anmelde-Status in der Masthead-Navigationszeile: "Anmelden"-Button bzw.
// nach Login Profilbild + Nickname (Klick → Abmelden). Farben erben vom
// Masthead (Navy auf Cyan) via text-current.
export function AuthStatus() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [dialogOffen, setDialogOffen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) {
      setProfil(null);
      return;
    }
    supabase
      .from("profiles")
      .select("id, nickname, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setProfil((data as Profil) ?? null));
  }, [session, supabase]);

  function abmelden() {
    if (window.confirm("Möchtest du dich abmelden?")) supabase.auth.signOut();
  }

  if (session) {
    const name = profil?.nickname ?? "Profil";
    return (
      <button
        onClick={abmelden}
        title={`Angemeldet als ${name} — klicken zum Abmelden`}
        className="flex items-center gap-2 rounded-full text-current hover:opacity-70 transition-opacity"
      >
        {profil?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profil.avatar_url}
            alt=""
            className="h-7 w-7 rounded-full border border-current/20"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current/40 text-xs font-bold">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-[13px] font-semibold lg:inline">
          {name}
        </span>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setDialogOffen(true)}
        className="rounded-full border border-current/40 px-3.5 py-1.5 text-[13px] font-semibold text-current hover:opacity-70 transition-opacity"
      >
        Anmelden
      </button>
      {dialogOffen && <AnmeldeDialog onSchliessen={() => setDialogOffen(false)} />}
    </>
  );
}
