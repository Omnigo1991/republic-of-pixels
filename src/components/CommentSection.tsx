"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, type Kommentar, type Profil } from "@/lib/supabase";
import { AnmeldeDialog, NicknameWahl } from "./AuthDialog";
import { MASTER_NICKNAME, MASTER_RANG } from "@/lib/ranking";

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
  // WICHTIG: Die User-ID kommt aus diesem Ref statt aus supabase.auth.getSession() -
  // der Aufruf im Datenpfad führte zu einem Deadlock der Auth-Sperre (Fenster fror
  // nach dem Kommentieren ein, 05.08.2026).
  const sessionRef = useRef<Session | null>(null);

  const ladeAlles = useCallback(async () => {
    const [{ data: k }, { data: v }] = await Promise.all([
      supabase
        .from("comments")
        .select("*, profiles!comments_author_id_fkey(id, nickname, avatar_url)")
        .eq("article_slug", articleSlug)
        .order("created_at", { ascending: true }),
      supabase.from("comment_votes").select("comment_id, user_id"),
    ]);
    setKommentare((k as Kommentar[]) ?? []);
    const zaehler = new Map<number, number>();
    const eigene = new Set<number>();
    const uid = sessionRef.current?.user.id;
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
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  // Lädt initial und nach jedem Login/Logout neu (Ref immer vor dem Laden aktuell).
  useEffect(() => {
    sessionRef.current = session;
    ladeAlles();
  }, [session, ladeAlles]);

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

  // Entfernte Kommentare verschwinden komplett; ein Platzhalter bleibt nur,
  // wenn ein entfernter Wurzelkommentar noch sichtbare Antworten hat.
  const antwortenZu = (id: number) =>
    kommentare.filter((k) => k.parent_id === id && !k.deleted);
  const wurzeln = kommentare.filter(
    (k) => k.parent_id === null && (!k.deleted || antwortenZu(k.id).length > 0)
  );

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
    window.alert("Danke - die Redaktion schaut sich den Kommentar an.");
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
      {/* Der Abmelde-Knopf rechts ist hoeher als die Ueberschrift und
          zieht die Zeile auf - der Abstand zur Linie lag dadurch bei
          15 px (Handy 20), waehrend jede andere Sektion 12 px hat.
          Absolut gesetzt beeinflusst er die Zeilenhoehe nicht mehr. */}
      <div className="relative mb-3 flex items-baseline justify-between">
        <h2 id="kommentare-heading" className="text-xl font-semibold tracking-tight text-text-primary">
          Kommentare
          {/* Die Null verstecken (Tim-Freigabe 14.08.2026): "Kommentare (0)"
              wirkt wie ein leeres Restaurant - die Zahl erscheint erst, wenn
              mindestens ein Kommentar da ist. Der Aufruf "schreib den
              ersten!" weiter unten übernimmt den leeren Zustand. */}
          {kommentare.filter((k) => !k.deleted).length > 0 && (
            <span className="text-text-tertiary">
              {" "}({kommentare.filter((k) => !k.deleted).length})
            </span>
          )}
        </h2>
        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {session ? (
          <span />
        ) : (
          <button
            onClick={() => setLoginOffen(true)}
            className="rounded-full bg-[#0B0616] px-4 py-1.5 text-sm font-extrabold text-accent transition-opacity hover:opacity-80"
          >
            Anmelden
          </button>
        )}
        </div>
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
          Melde dich an, um mitzudiskutieren - mit Google, Discord oder E-Mail.
        </button>
      )}

      <div className="mt-8 flex flex-col gap-6">
        {laden && <p className="text-sm text-text-tertiary">Kommentare werden geladen …</p>}
        {!laden && wurzeln.length === 0 && (
          <p className="text-sm text-text-tertiary">Noch keine Kommentare - schreib den ersten!</p>
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
        {k.profiles?.nickname === MASTER_NICKNAME ? (
          // Master-Account: Logo als Profilbild, hervorgehoben
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent ring-2 ring-accent/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-avatar-navy.png" alt="" className="h-full w-full" />
          </span>
        ) : k.profiles?.avatar_url ? (
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
        {k.profiles?.nickname ? (
          <Link
            href={`/profil/${k.profiles.nickname}`}
            className="text-sm font-semibold text-text-primary hover:text-accent transition-colors"
          >
            {k.profiles.nickname}
          </Link>
        ) : (
          <span className="text-sm font-semibold text-text-primary">Unbekannt</span>
        )}
        {/* EXAKT die Profil-Badge-Rezeptur (von Tim auf dem iPhone als
            korrekt bestätigt, 08.08.2026) - eine Bauweise überall statt
            einer Mini-Variante mit eigener Sub-Pixel-Physik: Die 9px-
            Version renderte in iOS-Safari anders als im Test-Chromium. */}
        {k.profiles?.nickname === MASTER_NICKNAME && (
          <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-[5px] text-[11px] leading-none ${MASTER_RANG.klasse}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-avatar.png" alt="" className="h-3.5 w-3.5" />
            <span className="flex h-3.5 items-center">REDAKTION</span>
          </span>
        )}
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
  const feldRef = useRef<HTMLTextAreaElement>(null);

  // EINZEILIG, WÄCHST MIT (Tim, 25.08.2026): Das Feld stand als
  // dreizeiliger Kasten da und liess sich unten rechts am Anfasser
  // grossziehen - eine Browser-Voreinstellung, die niemand gewählt hat und
  // mit der man das Layout zerreissen kann.
  //
  // Jetzt startet es einzeilig und wächst beim Tippen mit dem Inhalt.
  // Der Weg dahin: Höhe erst auf "auto" zurücksetzen, DANN scrollHeight
  // lesen. Ohne das Zurücksetzen misst man die alte Höhe mit und das Feld
  // kann nur noch wachsen, nie wieder schrumpfen - etwa wenn jemand seinen
  // Text wieder löscht.
  //
  // Deckel bei 320 px, damit ein sehr langer Kommentar nicht die halbe
  // Seite einnimmt; darüber scrollt das Feld wie vorher.
  const MAX_HOEHE = 320;
  useEffect(() => {
    const el = feldRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HOEHE)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HOEHE ? "auto" : "hidden";
  }, [text]);

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
    if (error) return setFehler("Senden fehlgeschlagen - bitte erneut versuchen.");
    setText("");
    onGesendet();
  }

  return (
    <div>
      <textarea
        ref={feldRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={1}
        maxLength={4000}
        placeholder={parentId ? "Deine Antwort …" : "Was denkst du dazu?"}
        // resize-none nimmt den Anfasser unten rechts weg (Tim, 25.08.2026:
        // "das will ich nicht"). Die Höhe macht stattdessen der Inhalt -
        // siehe wachsen() oben.
        className="block w-full resize-none overflow-hidden rounded-2xl border border-border-default bg-surface-panel p-4 text-[15px] leading-6 text-text-primary placeholder:text-text-disabled focus:border-accent/60 focus:outline-none"
      />
      {fehler && <p className="mt-1 text-xs text-error">{fehler}</p>}
      <div className="mt-2 flex justify-end">
        <button
          onClick={senden}
          disabled={sendet || !text.trim()}
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0C0B1A] transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {sendet ? "Wird gesendet …" : parentId ? "Antworten" : "Kommentieren"}
        </button>
      </div>
    </div>
  );
}
