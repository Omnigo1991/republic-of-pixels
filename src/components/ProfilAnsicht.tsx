"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase, type Profil } from "@/lib/supabase";
import { getAllArticles } from "@/lib/articles";
import {
  MASTER_NICKNAME,
  MASTER_RANG,
  RAENGE,
  naechsterRang,
  punkteBerechnen,
  rangFuer,
} from "@/lib/ranking";
import { splitTitle } from "@/lib/format";

interface LetzterKommentar {
  id: number;
  article_slug: string;
  body: string;
  created_at: string;
}

// Öffentliche Profilseite: Rang-Badge, Punkte, Statistiken, letzte Kommentare.
// Der Master-Account (Redaktion) wird mit Logo und exklusivem Badge hervorgehoben.
export function ProfilAnsicht({ nickname }: { nickname: string }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [nichtGefunden, setNichtGefunden] = useState(false);
  const [beitritt, setBeitritt] = useState<string | null>(null);
  const [stats, setStats] = useState({ kommentare: 0, erhalteneVotes: 0, vergebeneVotes: 0 });
  const [letzte, setLetzte] = useState<LetzterKommentar[]>([]);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, nickname, avatar_url, created_at")
        .eq("nickname", nickname)
        .maybeSingle();
      if (!p) {
        setNichtGefunden(true);
        return;
      }
      setProfil(p as Profil);
      setBeitritt((p as { created_at?: string }).created_at ?? null);

      const { data: kommentare } = await supabase
        .from("comments")
        .select("id, article_slug, body, created_at")
        .eq("author_id", p.id)
        .eq("deleted", false)
        .order("created_at", { ascending: false });

      const ids = (kommentare ?? []).map((k) => k.id);
      let erhalten = 0;
      if (ids.length > 0) {
        const { count } = await supabase
          .from("comment_votes")
          .select("comment_id", { count: "exact", head: true })
          .in("comment_id", ids);
        erhalten = count ?? 0;
      }
      const { count: vergeben } = await supabase
        .from("comment_votes")
        .select("comment_id", { count: "exact", head: true })
        .eq("user_id", p.id);

      setStats({
        kommentare: (kommentare ?? []).length,
        erhalteneVotes: erhalten,
        vergebeneVotes: vergeben ?? 0,
      });
      setLetzte((kommentare ?? []).slice(0, 5) as LetzterKommentar[]);
    })();
  }, [supabase, nickname]);

  const titelVon = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of getAllArticles()) map.set(a.slug, a.title);
    return map;
  }, []);

  if (nichtGefunden) {
    return (
      <div className="mx-auto max-w-article px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Profil nicht gefunden</h1>
        <p className="mt-3 text-text-secondary">
          Unter „{nickname}" gibt es kein Mitglied der Republic.
        </p>
      </div>
    );
  }

  if (!profil) {
    return <p className="mx-auto max-w-article px-4 py-20 text-sm text-text-tertiary">Profil wird geladen …</p>;
  }

  const istMaster = profil.nickname === MASTER_NICKNAME;
  const punkte = punkteBerechnen(stats);
  const rang = rangFuer(punkte, profil.nickname);
  const next = naechsterRang(punkte, profil.nickname);

  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Kopf */}
      <div className={`flex flex-col items-start gap-6 rounded-2xl border p-6 sm:flex-row sm:items-center sm:p-8 ${istMaster ? "border-accent/50 bg-accent-wash/25" : "border-border-subtle bg-surface-card"}`}>
        {istMaster ? (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F0D2C]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/r-mark.png" alt="" className="h-10 w-auto translate-x-[5px] translate-y-[5px]" />
          </span>
        ) : profil.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profil.avatar_url} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-accent-wash text-3xl font-bold text-accent">
            {profil.nickname.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
              {profil.nickname}
            </h1>
            <span className={`rounded-full border px-3 py-1 text-[11px] ${rang.klasse}`}>
              {rang.name}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {istMaster
              ? "Offizieller Account der Republic-of-Pixels-Redaktion."
              : rang.beschreibung}
          </p>
          {beitritt && (
            <p className="mt-1 text-xs text-text-tertiary">
              Mitglied seit{" "}
              {new Date(beitritt).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Statistiken */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { wert: punkte, label: "Punkte" },
          { wert: stats.kommentare, label: "Kommentare" },
          { wert: stats.erhalteneVotes, label: "Upvotes erhalten" },
          { wert: stats.vergebeneVotes, label: "Upvotes vergeben" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border-subtle bg-surface-card p-5 text-center">
            <p className="text-2xl font-bold text-accent">{s.wert}</p>
            <p className="mt-1 text-xs text-text-tertiary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Rang-Fortschritt */}
      {next && (
        <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-text-secondary">
              Nächster Rang: <span className="font-semibold text-text-primary">{next.rang.name}</span>
            </span>
            <span className="text-text-tertiary">
              noch {next.fehlend} {next.fehlend === 1 ? "Punkt" : "Punkte"}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${Math.min(100, Math.round((punkte / next.rang.ab) * 100))}%` }}
            />
          </div>
          <p className="mt-3 text-xs text-text-tertiary">
            Punkte sammelst du mit Kommentaren (+3), erhaltenen Upvotes (+2) und vergebenen Upvotes (+1).
          </p>
        </div>
      )}

      {/* Alle Ränge */}
      {!istMaster && (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {RAENGE.map((r) => (
            <span
              key={r.name}
              title={`${r.beschreibung} (ab ${r.ab} Punkten)`}
              className={`rounded-full border px-3 py-1 text-[11px] ${punkte >= r.ab ? r.klasse : "border-border-subtle text-text-disabled"}`}
            >
              {r.name}
            </span>
          ))}
          <span title={MASTER_RANG.beschreibung} className="rounded-full border border-border-subtle px-3 py-1 text-[11px] text-text-disabled">
            {MASTER_RANG.name} · exklusiv
          </span>
        </div>
      )}

      {/* Letzte Kommentare */}
      <h2 className="mt-12 mb-4 text-xl font-semibold tracking-tight text-text-primary">
        Letzte Kommentare
      </h2>
      {letzte.length === 0 && (
        <p className="text-sm text-text-tertiary">Noch keine Kommentare geschrieben.</p>
      )}
      <div className="flex flex-col gap-4">
        {letzte.map((k) => {
          const titel = titelVon.get(k.article_slug);
          const { headline } = titel ? splitTitle(titel) : { headline: k.article_slug };
          return (
            <Link
              key={k.id}
              href={`/artikel/${k.article_slug}`}
              className="rounded-2xl border border-border-subtle bg-surface-card p-4 transition-colors hover:bg-surface-hover"
            >
              <p className="line-clamp-2 text-sm text-text-secondary">„{k.body}"</p>
              <p className="mt-2 text-xs text-text-tertiary">
                zu <span className="text-accent">{headline}</span>
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
