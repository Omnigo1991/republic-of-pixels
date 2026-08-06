"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupabase, type Profil } from "@/lib/supabase";
import { getAllArticles } from "@/lib/articles";
import {
  MASTER_NICKNAME,
  RAENGE,
  naechsterRang,
  punkteBerechnen,
  rangFuer,
} from "@/lib/ranking";
import { splitTitle, formatRelative } from "@/lib/format";
import { SectionDivider } from "./SectionDivider";
import { RankIcon } from "./RankIcons";

interface LetzterKommentar {
  id: number;
  article_slug: string;
  body: string;
  created_at: string;
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.6l-5.88 3.01 1.12-6.55-4.76-4.64 6.58-.96L12 2.5z" />
    </svg>
  );
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9.5L5 21v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}

function IconArrowUp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3.5l7 7.5h-4.5v9.5h-5V11h-4.5l7-7.5z" />
    </svg>
  );
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
  const punkte = punkteBerechnen(stats) + (profil.bonus_punkte ?? 0);
  const rang = rangFuer(punkte, profil.nickname);
  const next = naechsterRang(punkte, profil.nickname);

  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Kopf */}
      <div className={`relative overflow-hidden rounded-2xl border p-6 shadow-card sm:p-8 ${istMaster ? "border-accent/50 bg-accent-wash/25" : "border-border-subtle bg-surface-card"}`}>
        {!istMaster && (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-accent-wash/30 to-transparent" />
        )}
        <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {istMaster ? (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0F0D2C] ring-4 ring-accent/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/r-avatar.png" alt="" className="h-full w-full" />
            </span>
          ) : profil.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profil.avatar_url} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-bg-base" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-accent-wash text-3xl font-bold text-accent ring-4 ring-bg-base">
              {profil.nickname.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
                {profil.nickname}
              </h1>
              <span className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-3.5 py-[5px] text-[11px] leading-none ${rang.klasse}`}>
                {istMaster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/brand/r-avatar-navy.png" alt="" className="h-3.5 w-3.5" />
                ) : (
                  <RankIcon iconKey={rang.icon} className="h-3.5 w-3.5" />
                )}
                <span>{rang.name}</span>
              </span>
            </div>
          <p className="mt-2 text-sm text-text-secondary">
            {istMaster
              ? "Offizieller Account der Redaktion von Republic of Pixels."
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
      </div>

      {/* Statistiken */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-accent/30 bg-accent-wash/20 p-5 text-center">
          <IconStar className="mx-auto h-5 w-5 text-accent" />
          <p className="mt-2 text-2xl font-bold text-accent">{punkte}</p>
          <p className="mt-1 text-xs text-text-secondary">Punkte</p>
        </div>
        {[
          { wert: stats.kommentare, label: "Kommentare", Icon: IconChat },
          { wert: stats.erhalteneVotes, label: "Upvotes erhalten", Icon: IconArrowUp },
          { wert: stats.vergebeneVotes, label: "Upvotes vergeben", Icon: IconArrowUp },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border-subtle bg-surface-card p-5 text-center">
            <s.Icon className="mx-auto h-5 w-5 text-text-tertiary" />
            <p className="mt-2 text-2xl font-bold text-text-primary">{s.wert}</p>
            <p className="mt-1 text-xs text-text-tertiary">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Rang-Fortschritt */}
      {next && (
        <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 text-text-secondary">
              Nächster Rang:
              <RankIcon iconKey={next.rang.icon} className="h-3.5 w-3.5 text-accent" />
              <span className="font-semibold text-text-primary">{next.rang.name}</span>
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
            Punkte sammelst du mit Kommentaren (+2) und erhaltenen Upvotes (+1).
          </p>
        </div>
      )}

      {/* Alle Ränge */}
      {!istMaster && (
        <div className="mt-6 rounded-2xl border border-border-subtle bg-surface-card p-5">
          <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid min-w-[420px] grid-cols-5">
              {RAENGE.map((r, i) => {
                const erreicht = punkte >= r.ab;
                const istAktuell = rang.name === r.name;
                const naechsteErreicht = i < RAENGE.length - 1 && punkte >= RAENGE[i + 1].ab;
                return (
                  <div key={r.name} className="relative flex flex-col items-center gap-2">
                    {i > 0 && (
                      <div
                        className={`absolute left-0 top-[22px] h-0.5 w-1/2 -translate-y-1/2 ${erreicht ? "bg-accent/50" : "bg-border-subtle"}`}
                      />
                    )}
                    {i < RAENGE.length - 1 && (
                      <div
                        className={`absolute right-0 top-[22px] h-0.5 w-1/2 -translate-y-1/2 ${naechsteErreicht ? "bg-accent/50" : "bg-border-subtle"}`}
                      />
                    )}
                    <div
                      title={`${r.beschreibung} (ab ${r.ab} Punkten)`}
                      className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full border-2 ${erreicht ? "border-accent bg-bg-elevated" : "border-border-subtle bg-bg-elevated"} ${istAktuell ? "ring-2 ring-accent ring-offset-2 ring-offset-surface-card" : ""}`}
                    >
                      <RankIcon iconKey={r.icon} className={`h-5 w-5 ${erreicht ? "text-accent" : "text-text-disabled"}`} />
                    </div>
                    <span className={`text-center text-[11px] leading-tight ${erreicht ? "text-text-primary" : "text-text-disabled"}`}>
                      {r.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Letzte Kommentare */}
      <h2 className="mt-12 mb-3 text-xl font-semibold tracking-tight text-text-primary">
        Letzte Kommentare
      </h2>
      <SectionDivider />
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
                zu <span className="text-accent">{headline}</span> · {formatRelative(k.created_at)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
