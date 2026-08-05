"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, type Profil } from "@/lib/supabase";
import { AnmeldeDialog } from "./AuthDialog";
import { MASTER_NICKNAME } from "@/lib/ranking";

// Anmelde-Status in der Masthead-Navigationszeile. Angemeldet: Profilbild +
// Nickname, Klick öffnet ein kleines Menü (Profil / Einstellungen / Abmelden).
// Abgemeldet: "Anmelden"-Button mit Login-Dialog.
export function AuthStatus() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [dialogOffen, setDialogOffen] = useState(false);
  const [menueOffen, setMenueOffen] = useState(false);
  const [menuePos, setMenuePos] = useState({ top: 0, right: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menueRef = useRef<HTMLDivElement>(null);

  function menueUmschalten() {
    const rect = wrapperRef.current?.getBoundingClientRect();
    if (rect) setMenuePos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setMenueOffen((o) => !o);
  }

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

  // Menü schliessen bei Klick ausserhalb
  useEffect(() => {
    if (!menueOffen) return;
    function onKlick(e: MouseEvent) {
      const ziel = e.target as Node;
      if (
        wrapperRef.current && !wrapperRef.current.contains(ziel) &&
        menueRef.current && !menueRef.current.contains(ziel)
      ) {
        setMenueOffen(false);
      }
    }
    document.addEventListener("mousedown", onKlick);
    return () => document.removeEventListener("mousedown", onKlick);
  }, [menueOffen]);

  if (session) {
    const name = profil?.nickname ?? "Profil";
    const istMaster = profil?.nickname === MASTER_NICKNAME;
    return (
      <div ref={wrapperRef} className="relative">
        <button
          onClick={menueUmschalten}
          aria-haspopup="menu"
          aria-expanded={menueOffen}
          title={`Angemeldet als ${name}`}
          className="flex items-center gap-2 rounded-full text-current hover:opacity-70 transition-opacity"
        >
          {istMaster ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F0D2C]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/r-avatar.png" alt="" className="h-full w-full" />
            </span>
          ) : profil?.avatar_url ? (
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

        {menueOffen && createPortal(
          <div
            ref={menueRef}
            role="menu"
            style={{ top: menuePos.top, right: menuePos.right }}
            className="fixed z-[70] w-48 overflow-hidden rounded-xl border border-border-default bg-bg-elevated py-1.5 text-text-primary shadow-elevated"
          >
            <Link
              href={`/profil/${name}`}
              onClick={() => setMenueOffen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors"
            >
              Mein Profil
            </Link>
            <Link
              href="/einstellungen"
              onClick={() => setMenueOffen(false)}
              className="block px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors"
            >
              Einstellungen
            </Link>
            {istMaster && (
              <Link
                href="/redaktion/statistik"
                onClick={() => setMenueOffen(false)}
                className="block px-4 py-2.5 text-sm text-accent hover:bg-surface-hover transition-colors"
              >
                Statistik
              </Link>
            )}
            <div className="mx-3 my-1 h-px bg-border-subtle" />
            <button
              onClick={() => {
                setMenueOffen(false);
                supabase.auth.signOut();
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-surface-hover hover:text-error transition-colors"
            >
              Abmelden
            </button>
          </div>,
          document.body
        )}
      </div>
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
