"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, type Kommentar, type Profil } from "@/lib/supabase";

// Echtes Kommentarsystem (ersetzt die frühere Demo-Attrappe).
// Datenhaltung: Supabase (supabase/schema.sql), Moderation: sofort sichtbar
// + Melden-Button, eine Antwort-Ebene, Upvotes, Soft-Delete eigener Beiträge.

function zeitAbstand(iso: string): string {
  const sek = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sek < 60) return "gerade eben";
  if (sek < 3600) return `vor ${Math.floor(sek / 60)} Min.`;
  if (sek < 86400) return `vor ${Math.floor(sek / 3600)} Std.`;
  return `vor ${Math.floor(sek / 86400)} Tagen`;
}

export function CommentSection({ articleSlug }: { articleSlug: string }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [kommentare, setKommentare] = useState<Kommentar[]>([]);
  const [votes, setVotes] = useState<Map<number, number>>(new Map());
  const [eigeneVotes, setEigeneVotes] = useState<Set<number>>(new Set());
  const [laden, setLaden] = useState(true);
  const [loginOffen, setLoginOffen] = useState(false);

  const ladeAlles = useCallback(async () => {
    const [{ data: k }, { data: v }] = await Promise.all([
      supabase
        .from("comments")
        .select("*, profiles(id, nickname, avatar_url)")
        .eq("article_slug", articleSlug)
        .order("created_at", { ascending: true }),
      supabase.from("comment_votes").select("comment_id, user_id"),
    ]);
    setKommentare((k as Kommentar[]) ?? []);
    const zaehler = new Map<number, number>();
    const eigene = new Set<number>();
    const uid = (await supabase.auth.getSession()).data.session?.user.id;
    for (const eintrag of v ?? []) {
      zaehler.set(eintrag.comment_id, (zaehler.get(eintrag.comment_id) ?? 0) + 1);
      if (uid && eintrag.user_id === uid) eigene.add(eintrag.comment_id);
    }
    setVotes(zaehler);
    setEigeneVotes(eigene);
    setLaden(false);
  }, [supabase, articleSlug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    ladeAlles();
    return () => sub.subscription.unsubscribe();
  }, [supabase, ladeAlles]);

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

  const wurzeln = kommentare.filter((k) => k.parent_id === null);
  const antwortenZu = (id: number) => kommentare.filter((k) => k.parent_id === id);

  async function stimmen(kommentarId: number) {
    if (!session) return setLoginOffen(true);
    if (eigeneVotes.has(kommentarId)) {
      await supabase
        .from("comment_votes")
        .delete()
        .match({ comment_id: kommentarId, user_id: session.user.id });
    } else {
      await supabase
        .from("comment_votes")
        .insert({ comment_id: kommentarId, user_id: session.user.id });
    }
    ladeAlles();
  }

  async function melden(kommentarId: number) {
    if (!session) return setLoginOffen(true);
    const grund = window.prompt("Warum meldest du diesen Kommentar? (optional)") ?? "";
    await supabase.from("comment_reports").insert({
      comment_id: kommentarId,
      reporter_id: session.user.id,
      reason: grund.slice(0, 500),
    });
    window.alert("Danke — die Redaktion schaut sich den Kommentar an.");
  }

  async function loeschen(kommentarId: number) {
    if (!window.confirm("Deinen Kommentar wirklich entfernen?")) return;
    await supabase.from("comments").update({ deleted: true }).eq("id", kommentarId);
    ladeAlles();
  }

  function neuLadenNachProfil() {
    window.location.reload();
  }

  return (
    <section aria-labelledby="kommentare-heading" className="mt-4">
      <div className="mb-6 flex items-center justify-between">
        <h2 id="kommentare-heading" className="text-xl font-semibold tracking-tight text-text-primary">
          Kommentare{" "}
          <span className="text-text-tertiary">
            ({kommentare.filter((k) => !k.deleted).length})
          </span>
        </h2>
        {session ? (
          <button
            onClick={() => supabase.auth.signOut()}
            className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            {profil ? `Angemeldet als ${profil.nickname}` : "Angemeldet"} · Abmelden
          </button>
        ) : (
          <button
            onClick={() => setLoginOffen(true)}
            className="rounded-full border border-accent/50 px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            Anmelden
          </button>
        )}
      </div>

      {session && !profil && !laden && <NicknameWahl onFertig={neuLadenNachProfil} />}

      {session && profil && (
        <KommentarFormular
          articleSlug={articleSlug}
          parentId={null}
          autorId={session.user.id}
          onGesendet={ladeAlles}
        />
      )}
      {!session && (
        <button
          onClick={() => setLoginOffen(true)}
          className="w-full rounded-2xl border border-dashed border-border-default p-5 text-left text-sm text-text-tertiary hover:border-accent/50 hover:text-text-secondary transition-colors"
        >
          Melde dich an, um mitzudiskutieren — mit Google, Discord oder E-Mail.
        </button>
      )}

      <div className="mt-8 flex flex-col gap-6">
        {laden && <p className="text-sm text-text-tertiary">Kommentare werden geladen …</p>}
        {!laden && wurzeln.length === 0 && (
          <p className="text-sm text-text-tertiary">Noch keine Kommentare — schreib den ersten!</p>
        )}
        {wurzeln.map((k) => (
          <div key={k.id}>
            <EinKommentar
              kommentar={k}
              votes={votes.get(k.id) ?? 0}
              selbstGestimmt={eigeneVotes.has(k.id)}
              istEigener={session?.user.id === k.author_id}
              onVote={() => stimmen(k.id)}
              onMelden={() => melden(k.id)}
              onLoeschen={() => loeschen(k.id)}
              antwortErlaubt
              angemeldet={!!session && !!profil}
              articleSlug={articleSlug}
              autorId={session?.user.id ?? null}
              onGesendet={ladeAlles}
              onLoginNoetig={() => setLoginOffen(true)}
            />
            {antwortenZu(k.id).map((a) => (
              <div key={a.id} className="ml-6 mt-4 border-l border-border-subtle pl-5 sm:ml-10">
                <EinKommentar
                  kommentar={a}
                  votes={votes.get(a.id) ?? 0}
                  selbstGestimmt={eigeneVotes.has(a.id)}
                  istEigener={session?.user.id === a.author_id}
                  onVote={() => stimmen(a.id)}
                  onMelden={() => melden(a.id)}
                  onLoeschen={() => loeschen(a.id)}
                  antwortErlaubt={false}
                  angemeldet={!!session && !!profil}
                  articleSlug={articleSlug}
                  autorId={session?.user.id ?? null}
                  onGesendet={ladeAlles}
                  onLoginNoetig={() => setLoginOffen(true)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {loginOffen && <AnmeldeDialog onSchliessen={() => setLoginOffen(false)} />}
    </section>
  );
}

function EinKommentar(props: {
  kommentar: Kommentar;
  votes: number;
  selbstGestimmt: boolean;
  istEigener: boolean;
  antwortErlaubt: boolean;
  angemeldet: boolean;
  articleSlug: string;
  autorId: string | null;
  onVote: () => void;
  onMelden: () => void;
  onLoeschen: () => void;
  onGesendet: () => void;
  onLoginNoetig: () => void;
}) {
  const { kommentar: k } = props;
  const [antworten, setAntworten] = useState(false);

  if (k.deleted) {
    return <p className="text-sm italic text-text-disabled">Dieser Kommentar wurde entfernt.</p>;
  }

  return (
    <article>
      <div className="flex items-center gap-2.5">
        {k.profiles?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={k.profiles.avatar_url}
            alt=""
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-wash text-xs font-bold text-accent">
            {(k.profiles?.nickname ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="text-sm font-semibold text-text-primary">
          {k.profiles?.nickname ?? "Unbekannt"}
        </span>
        <span className="text-xs text-text-tertiary">{zeitAbstand(k.created_at)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-text-secondary">
        {k.body}
      </p>
      <div className="mt-2 flex items-center gap-4 text-xs text-text-tertiary">
        <button
          onClick={props.onVote}
          className={`flex items-center gap-1 transition-colors ${
            props.selbstGestimmt ? "text-accent" : "hover:text-text-primary"
          }`}
        >
          ▲ {props.votes > 0 ? props.votes : ""} <span className="sr-only">Upvote</span>
        </button>
        {props.antwortErlaubt && (
          <button
            onClick={() => (props.angemeldet ? setAntworten((a) => !a) : props.onLoginNoetig())}
            className="hover:text-text-primary transition-colors"
          >
            Antworten
          </button>
        )}
        {props.istEigener ? (
          <button onClick={props.onLoeschen} className="hover:text-error transition-colors">
            Entfernen
          </button>
        ) : (
          <button onClick={props.onMelden} className="hover:text-warning transition-colors">
            Melden
          </button>
        )}
      </div>
      {antworten && props.autorId && (
        <div className="mt-3">
          <KommentarFormular
            articleSlug={props.articleSlug}
            parentId={k.id}
            autorId={props.autorId}
            onGesendet={() => {
              setAntworten(false);
              props.onGesendet();
            }}
          />
        </div>
      )}
    </article>
  );
}

function KommentarFormular({
  articleSlug,
  parentId,
  autorId,
  onGesendet,
}: {
  articleSlug: string;
  parentId: number | null;
  autorId: string;
  onGesendet: () => void;
}) {
  const supabase = useMemo(() => getSupabase(), []);
  const [text, setText] = useState("");
  const [sendet, setSendet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function senden() {
    if (!text.trim()) return;
    setSendet(true);
    setFehler(null);
    const { error } = await supabase.from("comments").insert({
      article_slug: articleSlug,
      author_id: autorId,
      parent_id: parentId,
      body: text.trim(),
    });
    setSendet(false);
    if (error) return setFehler("Senden fehlgeschlagen — bitte erneut versuchen.");
    setText("");
    onGesendet();
  }

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={parentId ? 2 : 3}
        maxLength={4000}
        placeholder={parentId ? "Deine Antwort …" : "Was denkst du dazu?"}
        className="w-full rounded-2xl border border-border-default bg-surface-card p-4 text-[15px] text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
      />
      {fehler && <p className="mt-1 text-xs text-error">{fehler}</p>}
      <div className="mt-2 flex justify-end">
        <button
          onClick={senden}
          disabled={sendet || !text.trim()}
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#0F0D2C] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {sendet ? "Wird gesendet …" : parentId ? "Antworten" : "Kommentieren"}
        </button>
      </div>
    </div>
  );
}

function NicknameWahl({ onFertig }: { onFertig: () => void }) {
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
          ? "Dieser Nickname ist schon vergeben — probier einen anderen."
          : "3–24 Zeichen, erlaubt sind Buchstaben, Zahlen, Punkt, Minus und Unterstrich."
      );
      return;
    }
    onFertig();
  }

  return (
    <div className="mb-6 rounded-2xl border border-accent/35 bg-accent-wash/30 p-5">
      <p className="mb-1 text-sm font-semibold text-text-primary">
        Fast geschafft — wähle deinen Nickname
      </p>
      <p className="mb-3 text-xs text-text-tertiary">
        So erscheinst du in den Kommentaren. 3–24 Zeichen; Buchstaben, Zahlen, Punkt, Minus,
        Unterstrich.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="z. B. pixel_pilot"
          className="flex-1 rounded-full border border-border-default bg-surface-card px-4 py-2 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
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

function AnmeldeDialog({ onSchliessen }: { onSchliessen: () => void }) {
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
      if (error) setMeldung("Anmeldung fehlgeschlagen — E-Mail oder Passwort prüfen.");
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
            className="flex items-center justify-center gap-2.5 rounded-full border border-border-default py-2.5 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
          >
            <GoogleIcon /> Weiter mit Google
          </button>
          <button
            onClick={() => oauth("discord")}
            className="flex items-center justify-center gap-2.5 rounded-full border border-border-default py-2.5 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
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
            className="rounded-full border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
          />
          <input
            type="password"
            value={passwort}
            onChange={(e) => setPasswort(e.target.value)}
            placeholder={modus === "registrieren" ? "Passwort wählen (min. 8 Zeichen)" : "Passwort"}
            className="rounded-full border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
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
