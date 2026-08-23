"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, type Profil } from "@/lib/supabase";
import { AnmeldeDialog, NicknameWahl } from "./AuthDialog";
import { MASTER_NICKNAME, naechsterRang, punkteBerechnen } from "@/lib/ranking";

// Anmelde-Status in der Masthead-Navigationszeile. Angemeldet: Profilbild +
// Nickname, Klick öffnet ein kleines Menü (Profil / Einstellungen / Abmelden).
// Abgemeldet: "Anmelden"-Button mit Login-Dialog.
export function AuthStatus() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [profilGeladen, setProfilGeladen] = useState(false);
  const [punkte, setPunkte] = useState<number | null>(null);
  const [nicknameSpaeter, setNicknameSpaeter] = useState(false);
  const [dialogOffen, setDialogOffen] = useState(false);
  const [menueOffen, setMenueOffen] = useState(false);
  const [menuePos, setMenuePos] = useState({ top: 0, right: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const menueRef = useRef<HTMLDivElement>(null);

  function menueUmschalten() {
    // Öffnet exakt wie die Menükarte daneben (Tim, 23.08.2026). Die hängt
    // dort an der Kopfleiste: top-[72px] am Handy, sm:top-[74px] darüber,
    // rechts sm:right-6 und lg:right-8. Gerechnet wird ab dem Innenrand
    // der Leiste, weil ihr Weichzeichner der Bezugsrahmen ist. Werden die
    // Zahlen in MenueKarte.tsx geändert, müssen sie hier mitziehen.
    const leiste = wrapperRef.current?.closest(".kopf-leiste") ?? wrapperRef.current;
    const rect = leiste?.getBoundingClientRect();
    if (rect && leiste) {
      const stil = getComputedStyle(leiste);
      const innenOben = rect.top + parseFloat(stil.borderTopWidth || "0");
      const innenRechts = rect.right - parseFloat(stil.borderRightWidth || "0");
      const b = window.innerWidth;
      setMenuePos({
        top: innenOben + (b >= 640 ? 74 : 72),
        right: b - (innenRechts - (b >= 1024 ? 32 : b >= 640 ? 24 : 0)),
      });
    }
    setMenueOffen((o) => !o);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const profilLaden = useCallback(
    (userId: string) => {
      setProfilGeladen(false);
      return supabase
        .from("profiles")
        .select("id, nickname, avatar_url")
        .eq("id", userId)
        .maybeSingle()
        .then(({ data }) => {
          setProfil((data as Profil) ?? null);
          setProfilGeladen(true);
        });
    },
    [supabase]
  );

  useEffect(() => {
    if (!session) {
      setProfil(null);
      setProfilGeladen(false);
      return;
    }
    profilLaden(session.user.id);
  }, [session, profilLaden]);

  // Punktestand fürs Menü - leichtgewichtig (nur Zählungen, keine Listen).
  useEffect(() => {
    if (!profil) {
      setPunkte(null);
      return;
    }
    (async () => {
      const { count: kommentare } = await supabase
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", profil.id)
        .eq("deleted", false);
      const { data: eigeneKommentare } = await supabase
        .from("comments")
        .select("id")
        .eq("author_id", profil.id)
        .eq("deleted", false);
      const ids = (eigeneKommentare ?? []).map((k) => k.id);
      let erhalten = 0;
      if (ids.length > 0) {
        const { count } = await supabase
          .from("comment_votes")
          .select("comment_id", { count: "exact", head: true })
          .in("comment_id", ids);
        erhalten = count ?? 0;
      }
      setPunkte(punkteBerechnen({ kommentare: kommentare ?? 0, erhalteneVotes: erhalten, vergebeneVotes: 0 }));
    })();
  }, [profil, supabase]);

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

  const zeigeNicknameDialog = Boolean(session) && profilGeladen && !profil && !nicknameSpaeter;
  const nicknameDialog = zeigeNicknameDialog && (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={() => setNicknameSpaeter(true)}
    >
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <NicknameWahl onFertig={() => session && profilLaden(session.user.id)} />
        <button
          onClick={() => setNicknameSpaeter(true)}
          className="mt-3 w-full text-center text-xs text-text-tertiary hover:text-accent transition-colors"
        >
          Später festlegen
        </button>
      </div>
    </div>
  );

  if (session) {
    const name = profil?.nickname ?? "Profil";
    const istMaster = profil?.nickname === MASTER_NICKNAME;
    return (
      <div ref={wrapperRef} className="relative">
        {nicknameDialog}
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
              className="h-7 w-7 shrink-0 rounded-full border border-current/20"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current/40 text-xs font-bold">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="hidden max-w-[120px] truncate text-[14.5px] font-bold tracking-[-0.015em] lg:inline">
            {name}
          </span>
        </button>

        {menueOffen && createPortal(
          (() => {
            const next = punkte !== null && !istMaster ? naechsterRang(punkte, name) : null;
            return (
              <div
                ref={menueRef}
                role="menu"
                style={{ top: menuePos.top, right: menuePos.right }}
                className="konto-glas fixed z-[70] w-[288px] overflow-hidden rounded-[24px] border border-white/[0.18] bg-[rgba(18,18,30,0.92)] p-2 text-[#F2F8FF] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.7)] backdrop-blur-[22px]"
              >
                <div className="flex items-center gap-3 p-3">
                  {istMaster ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0F0D2C]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/r-avatar.png" alt="" className="h-full w-full" />
                    </span>
                  ) : profil?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profil.avatar_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full border border-current/20"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-current/40 text-sm font-bold">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#F2F8FF]">{name}</p>
                    {punkte !== null && (
                      <p className="text-[12px] text-[#8F95A9]">{punkte} Punkte</p>
                    )}
                  </div>
                </div>

                {next && (
                  <div className="px-3 py-3">
                    <p className="mb-1.5 text-xs text-text-tertiary">
                      Noch {next.fehlend} {next.fehlend === 1 ? "Punkt" : "Punkte"} bis {next.rang.name}
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-panel">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(120deg,#02F0D1,#FF2E97)] transition-[width]"
                        style={{ width: `${Math.min(100, Math.round(((punkte ?? 0) / next.rang.ab) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="pt-1.5">
                  <Link
                    href={`/profil/${name}`}
                    onClick={() => setMenueOffen(false)}
                    className="block px-4 py-2.5 text-sm hover:bg-surface-panelhover transition-colors"
                  >
                    Mein Profil
                  </Link>
                  <Link
                    href="/einstellungen"
                    onClick={() => setMenueOffen(false)}
                    className="block px-4 py-2.5 text-sm hover:bg-surface-panelhover transition-colors"
                  >
                    Einstellungen
                  </Link>
                  {istMaster && (
                    <Link
                      href="/redaktion/statistik"
                      onClick={() => setMenueOffen(false)}
                      className="block px-4 py-2.5 text-sm text-accent hover:bg-surface-panelhover transition-colors"
                    >
                      Statistik
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      setMenueOffen(false);
                      supabase.auth.signOut();
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm text-text-secondary hover:bg-surface-panelhover hover:text-error transition-colors"
                  >
                    Abmelden
                  </button>
                </div>
              </div>
            );
          })(),
          document.body
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setDialogOffen(true)}
        className="hidden shrink-0 rounded-full bg-white px-3 py-1.5 text-[13px] font-bold tracking-[-0.015em] text-[#0C0B1A] transition-opacity hover:opacity-85 sm:inline-block sm:px-4 sm:py-2 sm:text-[14px] lg:px-5 lg:py-2.5 lg:text-[14.5px]"
      >
        Anmelden
      </button>
      {dialogOffen && <AnmeldeDialog onSchliessen={() => setDialogOffen(false)} />}
    </>
  );
}
