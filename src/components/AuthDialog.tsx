"use client";

import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// Login-Dialog (Google/Discord/E-Mail) und Nickname-Wahl - genutzt von der
// Kommentarsektion und vom Anmelde-Status im Header (AuthStatus.tsx).

export function NicknameWahl({ onFertig }: { onFertig: () => void }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [name, setName] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);

  async function speichern() {
    setSendet(true);
    setFehler(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return;
    const avatar = (user.user_metadata?.avatar_url as string) ?? null;
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      nickname: name.trim(),
      avatar_url: avatar,
    });
    setSendet(false);
    if (error) {
      setFehler(
        error.code === "23505"
          ? "Dieser Nickname ist schon vergeben - probier einen anderen."
          : "3-24 Zeichen, erlaubt sind Buchstaben, Zahlen, Punkt, Minus und Unterstrich."
      );
      return;
    }
    onFertig();
  }

  return (
    <div className="mb-6 rounded-2xl border border-accent/35 bg-accent-wash/30 p-5">
      <p className="mb-1 text-sm font-semibold text-text-primary">
        Fast geschafft - wähle deinen Nickname
      </p>
      <p className="mb-3 text-xs text-text-tertiary">
        So erscheinst du in den Kommentaren. 3-24 Zeichen; Buchstaben, Zahlen, Punkt, Minus,
        Unterstrich.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="z. B. pixel_pilot"
          className="flex-1 rounded-full border border-border-default bg-surface-panel px-4 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
        />
        <button
          onClick={speichern}
          disabled={sendet || name.trim().length < 3}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#0F0D2C] hover:opacity-90 disabled:opacity-40"
        >
          Los geht&apos;s
        </button>
      </div>
      {fehler && <p className="mt-2 text-xs text-error">{fehler}</p>}
    </div>
  );
}

export function AnmeldeDialog({ onSchliessen }: { onSchliessen: () => void }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [modus, setModus] = useState<"login" | "registrieren">("login");
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);

  function oauth(provider: "google" | "discord") {
    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.href },
    });
  }

  async function mitEmail() {
    setSendet(true);
    setMeldung(null);
    if (modus === "registrieren") {
      const { error } = await supabase.auth.signUp({
        email,
        password: passwort,
        options: { emailRedirectTo: window.location.href },
      });
      setMeldung(
        error
          ? `Registrierung fehlgeschlagen: ${error.message}`
          : "Fast fertig! Bestätige den Link, den wir dir per E-Mail geschickt haben."
      );
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: passwort });
      if (error) setMeldung("Anmeldung fehlgeschlagen - E-Mail oder Passwort prüfen.");
      else onSchliessen();
    }
    setSendet(false);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={onSchliessen}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border-default bg-bg-elevated p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Anmelden</h3>
          <button
            onClick={onSchliessen}
            aria-label="Schliessen"
            className="text-text-tertiary hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => oauth("google")}
            className="flex items-center justify-center gap-2.5 rounded-full border border-border-default py-2.5 text-sm font-medium text-text-primary hover:bg-surface-panelhover transition-colors"
          >
            <GoogleIcon /> Weiter mit Google
          </button>
          <button
            onClick={() => oauth("discord")}
            className="flex items-center justify-center gap-2.5 rounded-full border border-border-default py-2.5 text-sm font-medium text-text-primary hover:bg-surface-panelhover transition-colors"
          >
            <DiscordIcon /> Weiter mit Discord
          </button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-text-disabled">
          <span className="h-px flex-1 bg-border-subtle" /> oder per E-Mail{" "}
          <span className="h-px flex-1 bg-border-subtle" />
        </div>

        <div className="flex flex-col gap-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-Mail-Adresse"
            className="rounded-full border border-border-default bg-surface-panel px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
          />
          <input
            type="password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            placeholder={modus === "registrieren" ? "Passwort wählen (min. 8 Zeichen)" : "Passwort"}
            className="rounded-full border border-border-default bg-surface-panel px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
          />
          <button
            onClick={mitEmail}
            disabled={sendet || !email || passwort.length < 8}
            className="rounded-full bg-accent py-2.5 text-sm font-semibold text-[#0F0D2C] hover:opacity-90 disabled:opacity-40"
          >
            {modus === "registrieren" ? "Konto erstellen" : "Anmelden"}
          </button>
        </div>

        {meldung && <p className="mt-3 text-xs text-text-secondary">{meldung}</p>}

        <button
          onClick={() => setModus((m) => (m === "login" ? "registrieren" : "login"))}
          className="mt-4 w-full text-center text-xs text-text-tertiary hover:text-accent transition-colors"
        >
          {modus === "login" ? "Noch kein Konto? Jetzt registrieren" : "Schon ein Konto? Anmelden"}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.46a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.1 3.56-5.18 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.28v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.76c1.76 0 3.34.6 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l4 3.1C6.22 6.87 8.87 4.76 12 4.76z"
      />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#5865F2" aria-hidden="true">
      <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.5 0 12.6 12.6 0 0 0-.61-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.04.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.02c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.9.08.08 0 0 1-.01-.12c.13-.1.25-.19.37-.29a.07.07 0 0 1 .08-.01c3.93 1.8 8.18 1.8 12.06 0a.07.07 0 0 1 .08 0c.12.1.25.2.37.3a.08.08 0 0 1 0 .12 12.3 12.3 0 0 1-1.88.89.08.08 0 0 0-.04.12c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .08.03 19.84 19.84 0 0 0 6.03-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z" />
    </svg>
  );
}
