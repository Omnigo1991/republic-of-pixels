"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, type Profil } from "@/lib/supabase";
import { AnmeldeDialog } from "./AuthDialog";

// Konto-Einstellungen: Nickname ändern, Passwort ändern (nur E-Mail-Konten),
// Abmelden. Erreichbar über das Profil-Menü im Header.
export function EinstellungenForm() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [geladen, setGeladen] = useState(false);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [dialogOffen, setDialogOffen] = useState(false);

  const [nickname, setNickname] = useState("");
  const [nickMeldung, setNickMeldung] = useState<string | null>(null);
  const [passwort, setPasswort] = useState("");
  const [pwMeldung, setPwMeldung] = useState<string | null>(null);
  const [avatarMeldung, setAvatarMeldung] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setGeladen(true);
    });
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
      .then(({ data }) => {
        setProfil((data as Profil) ?? null);
        if (data) setNickname((data as Profil).nickname);
      });
  }, [session, supabase]);

  async function nicknameSpeichern() {
    if (!profil) return;
    setNickMeldung(null);
    const { error } = await supabase
      .from("profiles")
      .update({ nickname: nickname.trim() })
      .eq("id", profil.id);
    setNickMeldung(
      error
        ? error.code === "23505"
          ? "Dieser Nickname ist schon vergeben."
          : "Ungültig: 3–24 Zeichen; Buchstaben, Zahlen, Punkt, Minus, Unterstrich."
        : "Gespeichert — dein neuer Nickname ist aktiv."
    );
  }

  async function avatarSpeichern(url: string | null) {
    if (!profil) return;
    setAvatarMeldung(null);
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", profil.id);
    if (error) {
      setAvatarMeldung("Speichern fehlgeschlagen — bitte erneut versuchen.");
      return;
    }
    setProfil({ ...profil, avatar_url: url });
    setAvatarMeldung("Profilbild gespeichert.");
  }

  async function avatarHochladen(datei: File) {
    if (!profil || !session) return;
    setAvatarMeldung(null);
    if (datei.size > 2 * 1024 * 1024) {
      setAvatarMeldung("Bitte ein Bild bis maximal 2 MB wählen.");
      return;
    }
    const endung = datei.type === "image/png" ? "png" : datei.type === "image/webp" ? "webp" : "jpg";
    const pfad = `${session.user.id}/avatar-${Date.now()}.${endung}`;
    const { error } = await supabase.storage.from("avatars").upload(pfad, datei, {
      upsert: true,
      contentType: datei.type,
    });
    if (error) {
      setAvatarMeldung(
        "Upload fehlgeschlagen — der Bilderspeicher ist noch nicht eingerichtet (schema-v3.sql) oder das Format wird nicht unterstützt."
      );
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(pfad);
    await avatarSpeichern(data.publicUrl);
  }

  async function passwortSpeichern() {
    setPwMeldung(null);
    const { error } = await supabase.auth.updateUser({ password: passwort });
    setPwMeldung(error ? `Fehlgeschlagen: ${error.message}` : "Neues Passwort gespeichert.");
    if (!error) setPasswort("");
  }

  if (!geladen) {
    return <p className="mx-auto max-w-article px-4 py-20 text-sm text-text-tertiary">Wird geladen …</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-article px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Einstellungen</h1>
        <p className="mt-3 text-text-secondary">Melde dich an, um deine Konto-Einstellungen zu verwalten.</p>
        <button
          onClick={() => setDialogOffen(true)}
          className="mt-6 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-[#0F0D2C] hover:opacity-90"
        >
          Anmelden
        </button>
        {dialogOffen && <AnmeldeDialog onSchliessen={() => setDialogOffen(false)} />}
      </div>
    );
  }

  const istEmailKonto = session.user.app_metadata?.provider === "email";

  return (
    <div className="mx-auto max-w-article px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Einstellungen</h1>
      <p className="mt-2 text-sm text-text-tertiary">
        Angemeldet mit {session.user.email ?? "deinem Konto"}
        {profil && (
          <>
            {" "}·{" "}
            <Link href={`/profil/${profil.nickname}`} className="text-accent hover:underline">
              Mein öffentliches Profil ansehen
            </Link>
          </>
        )}
      </p>

      {/* Nickname */}
      <div className="mt-8 rounded-2xl border border-border-subtle bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">Nickname</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Dein öffentlicher Name in Kommentaren und auf deinem Profil.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={24}
            className="flex-1 rounded-full border border-border-default bg-bg-elevated px-4 py-2.5 text-sm text-text-primary focus:border-accent/60 focus:outline-none"
          />
          <button
            onClick={nicknameSpeichern}
            disabled={!profil || nickname.trim().length < 3 || nickname.trim() === profil?.nickname}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#0F0D2C] hover:opacity-90 disabled:opacity-40"
          >
            Speichern
          </button>
        </div>
        {nickMeldung && <p className="mt-2 text-xs text-text-secondary">{nickMeldung}</p>}
      </div>

      {/* Profilbild */}
      <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">Profilbild</h2>
        <p className="mt-1 text-xs text-text-tertiary">
          Wähle einen Pixel-Sprite — oder deine Initiale bzw. dein Login-Profilbild.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Initiale (kein Bild) */}
          <button
            onClick={() => avatarSpeichern(null)}
            title="Initiale verwenden"
            className={`flex h-12 w-12 items-center justify-center rounded-full bg-accent-wash text-lg font-bold text-accent transition-transform hover:scale-105 ${profil?.avatar_url === null ? "ring-2 ring-accent" : "ring-1 ring-border-default"}`}
          >
            {(profil?.nickname ?? "?").slice(0, 1).toUpperCase()}
          </button>
          {/* Login-Profilbild (falls vorhanden) */}
          {typeof session.user.user_metadata?.avatar_url === "string" && (
            <button
              onClick={() => avatarSpeichern(session.user.user_metadata.avatar_url as string)}
              title="Profilbild aus deinem Login-Konto"
              className={`h-12 w-12 overflow-hidden rounded-full transition-transform hover:scale-105 ${profil?.avatar_url === session.user.user_metadata.avatar_url ? "ring-2 ring-accent" : "ring-1 ring-border-default"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={session.user.user_metadata.avatar_url as string} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            </button>
          )}
          {/* Pixel-Sprites */}
          {Array.from({ length: 12 }, (_, i) => `/avatars/sprite-${String(i + 1).padStart(2, "0")}.svg`).map((pfad) => (
            <button
              key={pfad}
              onClick={() => avatarSpeichern(pfad)}
              title="Pixel-Sprite wählen"
              className={`h-12 w-12 overflow-hidden rounded-full transition-transform hover:scale-105 ${profil?.avatar_url === pfad ? "ring-2 ring-accent" : "ring-1 ring-border-default"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pfad} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-accent/50 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10">
          Eigenes Bild hochladen (max. 2 MB)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const datei = e.target.files?.[0];
              if (datei) avatarHochladen(datei);
              e.target.value = "";
            }}
          />
        </label>
        {avatarMeldung && <p className="mt-3 text-xs text-text-secondary">{avatarMeldung}</p>}
      </div>

      {/* Passwort (nur E-Mail-Konten) */}
      <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">Passwort</h2>
        {istEmailKonto ? (
          <>
            <p className="mt-1 text-xs text-text-tertiary">Mindestens 8 Zeichen.</p>
            <div className="mt-4 flex gap-2">
              <input
                type="password"
                value={passwort}
                onChange={(e) => setPasswort(e.target.value)}
                placeholder="Neues Passwort"
                className="flex-1 rounded-full border border-border-default bg-bg-elevated px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
              />
              <button
                onClick={passwortSpeichern}
                disabled={passwort.length < 8}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#0F0D2C] hover:opacity-90 disabled:opacity-40"
              >
                Ändern
              </button>
            </div>
            {pwMeldung && <p className="mt-2 text-xs text-text-secondary">{pwMeldung}</p>}
          </>
        ) : (
          <p className="mt-1 text-sm text-text-secondary">
            Du meldest dich über {session.user.app_metadata?.provider === "google" ? "Google" : "Discord"} an —
            dein Passwort verwaltest du dort.
          </p>
        )}
      </div>

      {/* Abmelden */}
      <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">Sitzung</h2>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-4 rounded-full border border-error/50 px-5 py-2.5 text-sm font-medium text-error hover:bg-error/10 transition-colors"
        >
          Abmelden
        </button>
      </div>
    </div>
  );
}
