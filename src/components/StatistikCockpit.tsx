"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { Wachstumskurve, type Tageswert } from "./Wachstumskurve";
import { MASTER_NICKNAME } from "@/lib/ranking";

// Redaktions-Cockpit: eigene, cookielose Besucherstatistik aus page_views
// (schema-v4.sql). Zugriff ausschliesslich für den Master-Account — die
// Datenbank erzwingt das zusätzlich per Row-Level-Security.

interface Kennzahlen {
  heute: number;
  tage7: number;
  tage30: number;
  gesamt: number;
  besucherHeute: number;
  besucher7: number;
  besucher30: number;
  besucherGesamt: number;
  echtzeitAufrufe: number;
  echtzeitBesucher: number;
  registrierteKonten: number;
  herkunft: { quelle: string; besucher: number }[];
  verlauf: Tageswert[];
}

// Rückgabezeilen der Statistik-Funktionen aus supabase/schema-v9.sql.
interface VerlaufZeile {
  tag: string; // YYYY-MM-DD, Zürcher Kalendertag
  aufrufe: number;
  besucher: number;
}
interface HerkunftZeile {
  visitor: string;
  referrer: string | null;
  path: string;
}

// Herkunfts-Klassifikation: der erste Aufruf eines Besuchers in den letzten
// 7 Tagen bestimmt seine Quelle. Landet jemand ohne Referrer direkt auf /ig,
// kam er über den Instagram-Bio-Link (In-App-Browser senden oft keinen
// Referrer). Alte Einträge ohne referrer-Spalte zählen als "Direkt".
function quelleVon(referrer: string | null, path: string): string {
  const ref = (referrer ?? "").toLowerCase();
  if (ref.includes("instagram.") || path === "/ig") return "Instagram";
  if (ref.includes("google.")) return "Google";
  if (ref.includes("bing.")) return "Bing";
  if (ref.includes("duckduckgo.")) return "DuckDuckGo";
  if (ref.includes("twitter.") || ref.includes("//t.co") || ref.includes("//x.com")) return "X";
  if (ref.includes("reddit.")) return "Reddit";
  if (ref) return "Andere Websites";
  return "Direkt";
}

export function StatistikCockpit() {
  const supabase = useMemo(() => getSupabase(), []);

  // Wer das Cockpit öffnet, ist Redaktion: Gerät dauerhaft als intern
  // markieren — der VisitTracker zählt es ab jetzt nicht mehr mit
  // (eigene Aufrufe verfälschen sonst die Statistik; Tim, 07.08.2026).
  useEffect(() => {
    try {
      localStorage.setItem("rop_intern", "1");
    } catch {
      // Ohne localStorage kein Ausschluss möglich — unkritisch.
    }
  }, []);

  const [session, setSession] = useState<Session | null>(null);
  const [istMaster, setIstMaster] = useState<boolean | null>(null);
  const [zahlen, setZahlen] = useState<Kennzahlen | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [stand, setStand] = useState<Date | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!session) {
      setIstMaster(null);
      return;
    }
    supabase
      .from("profiles")
      .select("nickname")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => setIstMaster(data?.nickname === MASTER_NICKNAME));
  }, [session, supabase]);

  const laden = useCallback(async () => {
    const jetzt = Date.now();
    const iso = (ms: number) => new Date(ms).toISOString();
    const mitternacht = new Date();
    mitternacht.setHours(0, 0, 0, 0);

    async function anzahl(seit?: string) {
      let q = supabase.from("page_views").select("id", { count: "exact", head: true });
      if (seit) q = q.gte("created_at", seit);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    }
    // EINDEUTIGE BESUCHER ZAEHLT DIE DATENBANK (Tim, 13.08.2026).
    // Vorher holten wir die Roh-Zeilen und zaehlten sie hier im Browser.
    // Supabase liefert pro Abfrage aber nur begrenzt viele Zeilen aus, und
    // ohne Sortierung die AELTESTEN — die Gesamt-Abfrage sah damit nur die
    // ersten Tage nach dem Start und meldete WENIGER Besucher als die
    // 7-Tage-Abfrage. Das ist rechnerisch unmoeglich und war der Beweis,
    // dass die Abfrage nicht alle Zeilen sah. Siehe supabase/schema-v9.sql.
    async function besucher(seit?: string) {
      const { data, error } = await supabase.rpc("statistik_besucher", {
        seit: seit ?? null,
      });
      if (error) throw error;
      return (data as number | null) ?? 0;
    }

    try {
      const [heute, tage7, tage30, gesamt] = await Promise.all([
        anzahl(mitternacht.toISOString()),
        anzahl(iso(jetzt - 7 * 86400000)),
        anzahl(iso(jetzt - 30 * 86400000)),
        anzahl(),
      ]);
      const [besucherHeute, besucher7, besucher30, besucherGesamt, echtzeitBesucher] =
        await Promise.all([
          besucher(mitternacht.toISOString()),
          besucher(iso(jetzt - 7 * 86400000)),
          besucher(iso(jetzt - 30 * 86400000)),
          besucher(),
          besucher(iso(jetzt - 5 * 60000)),
        ]);
      const echtzeitAufrufe = await anzahl(iso(jetzt - 5 * 60000));

      const { count: registrierteKonten, error: kontenError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (kontenError) throw kontenError;

      // Herkunft: pro Besucher zählt der erste Aufruf im 7-Tage-Fenster.
      // Die Auswahl "erster Aufruf je Besucher" macht die Datenbank
      // (distinct on) — vorher lief sie über eine begrenzte Zeilenmenge und
      // sah nur die ältesten Besucher des Fensters.
      const { data: refRows, error: refError } = await supabase.rpc(
        "statistik_herkunft",
        { seit: iso(jetzt - 7 * 86400000) },
      );
      if (refError) throw refError;
      const quellen = new Map<string, number>();
      for (const r of (refRows ?? []) as HerkunftZeile[]) {
        const q = quelleVon(r.referrer ?? null, r.path);
        quellen.set(q, (quellen.get(q) ?? 0) + 1);
      }
      const herkunft = [...quellen.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([quelle, besucher]) => ({ quelle, besucher }));

      // WACHSTUMSKURVE (Tim, 11.08.2026): Tagesverlauf der letzten 30 Tage.
      // Kein neues Tracking noetig — die Zeitstempel lagen schon vor, sie
      // wurden nur nie nach Tagen gruppiert.
      // Auch hier zählt die Datenbank: Die alte Fassung holte 30 Tage
      // Roh-Zeilen und gruppierte sie hier — bei begrenzter Zeilenmenge
      // füllten sich nur die ältesten Tage, das rechte Ende der Kurve blieb
      // leer. Die Gruppierung nach Zürcher Kalendertag macht jetzt Postgres.
      const { data: verlaufRows, error: verlaufError } = await supabase.rpc(
        "statistik_verlauf",
        { von: iso(jetzt - 30 * 86400000) },
      );
      if (verlaufError) throw verlaufError;
      const tagesSchluessel = (d: Date) =>
        new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(d);
      // Alle 30 Tage vorbelegen, damit Tage ohne Aufrufe als 0 in der Kurve
      // stehen und nicht fehlen.
      const eimer = new Map<string, { aufrufe: number; besucher: number }>();
      for (let i = 29; i >= 0; i--) {
        eimer.set(tagesSchluessel(new Date(jetzt - i * 86400000)), {
          aufrufe: 0,
          besucher: 0,
        });
      }
      for (const r of (verlaufRows ?? []) as VerlaufZeile[]) {
        if (!eimer.has(r.tag)) continue;
        eimer.set(r.tag, { aufrufe: r.aufrufe, besucher: r.besucher });
      }
      const verlauf: Tageswert[] = [...eimer.entries()].map(([tag, e]) => ({
        tag,
        aufrufe: e.aufrufe,
        besucher: e.besucher,
      }));

      setZahlen({
        heute,
        tage7,
        tage30,
        gesamt,
        besucherHeute,
        besucher7,
        besucher30,
        besucherGesamt,
        echtzeitAufrufe,
        echtzeitBesucher,
        registrierteKonten: registrierteKonten ?? 0,
        herkunft,
        verlauf,
      });
      setStand(new Date());
      setFehler(null);
    } catch {
      setFehler(
        "Statistik-Daten nicht verfügbar — wurde schema-v9.sql schon im SQL-Editor ausgeführt?"
      );
    }
  }, [supabase]);

  // Laden + Echtzeit-Aktualisierung alle 30 Sekunden
  useEffect(() => {
    if (!istMaster) return;
    laden();
    const timer = setInterval(laden, 30000);
    return () => clearInterval(timer);
  }, [istMaster, laden]);

  if (!session || istMaster === false) {
    return (
      <div className="mx-auto max-w-article px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-text-primary">Redaktions-Statistik</h1>
        <p className="mt-3 text-text-secondary">
          Dieser Bereich ist dem Redaktions-Account vorbehalten.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text-primary">Statistik</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Eigene, cookielose Messung · aktualisiert alle 30 Sekunden
            {stand && ` · Stand ${stand.toLocaleTimeString("de-DE")}`}
          </p>
        </div>
        <a
          href="https://vercel.com/omnigo/republic-of-pixels-preview/analytics"
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-full border border-border-default px-4 py-2 text-sm text-text-secondary hover:border-accent/50 hover:text-accent transition-colors"
        >
          Vercel Analytics öffnen ↗
        </a>
      </div>

      {fehler && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-5 text-sm text-text-primary">
          {fehler}
        </div>
      )}

      {zahlen && (
        <>
          {/* Echtzeit */}
          <div className="mb-6 rounded-2xl border border-accent/35 bg-accent-wash/30 p-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
              </span>
              <p className="text-sm font-semibold text-text-primary">Gerade jetzt (letzte 5 Minuten)</p>
            </div>
            <div className="mt-4 flex gap-10">
              <div>
                <p className="text-3xl font-bold text-accent">{zahlen.echtzeitBesucher}</p>
                <p className="mt-1 text-xs text-text-tertiary">Besucher:innen</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-accent">{zahlen.echtzeitAufrufe}</p>
                <p className="mt-1 text-xs text-text-tertiary">Seitenaufrufe</p>
              </div>
            </div>
          </div>

          {/* Community */}
          <div className="mb-6 flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface-card p-6">
            <div>
              <p className="text-3xl font-bold text-text-primary">
                {zahlen.registrierteKonten.toLocaleString("de-DE")}
              </p>
              <p className="mt-1 text-xs text-text-tertiary">Registrierte Konten</p>
            </div>
          </div>

          {/* Kennzahlen */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { wert: zahlen.heute, label: "Aufrufe heute" },
              { wert: zahlen.besucherHeute, label: "Besucher heute" },
              { wert: zahlen.tage7, label: "Aufrufe 7 Tage" },
              { wert: zahlen.besucher7, label: "Besucher 7 Tage" },
              { wert: zahlen.tage30, label: "Aufrufe 30 Tage" },
              { wert: zahlen.besucher30, label: "Besucher 30 Tage" },
              { wert: zahlen.gesamt, label: "Aufrufe gesamt" },
              { wert: zahlen.besucherGesamt, label: "Besucher gesamt" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-border-subtle bg-surface-card p-5 text-center">
                <p className="text-2xl font-bold text-text-primary">{k.wert.toLocaleString("de-DE")}</p>
                <p className="mt-1 text-xs text-text-tertiary">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Wachstum — die Kurve steht bewusst direkt unter den Kennzahlen:
              Sie ist das Erste, was in einem Werbegespräch gezeigt wird. */}
          <div className="mt-10 mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-text-primary">Wachstum</h2>
            <span className="text-xs text-text-tertiary">Letzte 30 Tage</span>
          </div>
          <Wachstumskurve daten={zahlen.verlauf} />

          {/* Herkunft */}
          <h2 className="mt-10 mb-4 text-xl font-semibold tracking-tight text-text-primary">
            Herkunft der Besucher (7 Tage)
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border-subtle">
            {zahlen.herkunft.length === 0 && (
              <p className="p-5 text-sm text-text-tertiary">Noch keine Daten.</p>
            )}
            {zahlen.herkunft.map((h, i) => (
              <div
                key={h.quelle}
                className={`flex items-center justify-between gap-4 px-5 py-3 ${i % 2 === 0 ? "bg-surface-card" : "bg-bg-elevated"}`}
              >
                <span className="text-sm text-text-secondary">{h.quelle}</span>
                <span className="shrink-0 text-sm font-semibold text-accent">
                  {h.besucher.toLocaleString("de-DE")}
                </span>
              </div>
            ))}
          </div>

        </>
      )}
    </div>
  );
}
