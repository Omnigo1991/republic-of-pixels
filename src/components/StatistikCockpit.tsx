"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
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
  echtzeitAufrufe: number;
  echtzeitBesucher: number;
  registrierteKonten: number;
  topSeiten: { path: string; aufrufe: number }[];
}

export function StatistikCockpit() {
  const supabase = useMemo(() => getSupabase(), []);
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
    async function besucher(seit: string) {
      const { data, error } = await supabase
        .from("page_views")
        .select("visitor")
        .gte("created_at", seit)
        .limit(10000);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.visitor)).size;
    }

    try {
      const [heute, tage7, tage30, gesamt] = await Promise.all([
        anzahl(mitternacht.toISOString()),
        anzahl(iso(jetzt - 7 * 86400000)),
        anzahl(iso(jetzt - 30 * 86400000)),
        anzahl(),
      ]);
      const [besucherHeute, besucher7, echtzeitBesucher] = await Promise.all([
        besucher(mitternacht.toISOString()),
        besucher(iso(jetzt - 7 * 86400000)),
        besucher(iso(jetzt - 5 * 60000)),
      ]);
      const echtzeitAufrufe = await anzahl(iso(jetzt - 5 * 60000));

      const { count: registrierteKonten, error: kontenError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      if (kontenError) throw kontenError;

      const { data: seiten } = await supabase
        .from("page_views")
        .select("path")
        .gte("created_at", iso(jetzt - 7 * 86400000))
        .limit(10000);
      const zaehler = new Map<string, number>();
      for (const r of seiten ?? []) zaehler.set(r.path, (zaehler.get(r.path) ?? 0) + 1);
      const topSeiten = [...zaehler.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([path, aufrufe]) => ({ path, aufrufe }));

      setZahlen({
        heute,
        tage7,
        tage30,
        gesamt,
        besucherHeute,
        besucher7,
        echtzeitAufrufe,
        echtzeitBesucher,
        registrierteKonten: registrierteKonten ?? 0,
        topSeiten,
      });
      setStand(new Date());
      setFehler(null);
    } catch {
      setFehler(
        "Statistik-Daten nicht verfügbar — wurde schema-v4.sql schon im SQL-Editor ausgeführt?"
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
          <div className="mb-6 rounded-2xl border border-accent/35 bg-accent-wash/25 p-6">
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { wert: zahlen.heute, label: "Aufrufe heute" },
              { wert: zahlen.besucherHeute, label: "Besucher heute" },
              { wert: zahlen.tage7, label: "Aufrufe 7 Tage" },
              { wert: zahlen.besucher7, label: "Besucher 7 Tage" },
              { wert: zahlen.tage30, label: "Aufrufe 30 Tage" },
              { wert: zahlen.gesamt, label: "Aufrufe gesamt" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-border-subtle bg-surface-card p-5 text-center">
                <p className="text-2xl font-bold text-text-primary">{k.wert.toLocaleString("de-DE")}</p>
                <p className="mt-1 text-xs text-text-tertiary">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Top-Seiten */}
          <h2 className="mt-10 mb-4 text-xl font-semibold tracking-tight text-text-primary">
            Meistbesuchte Seiten (7 Tage)
          </h2>
          <div className="overflow-hidden rounded-2xl border border-border-subtle">
            {zahlen.topSeiten.length === 0 && (
              <p className="p-5 text-sm text-text-tertiary">Noch keine Daten.</p>
            )}
            {zahlen.topSeiten.map((s, i) => (
              <div
                key={s.path}
                className={`flex items-center justify-between gap-4 px-5 py-3 ${i % 2 === 0 ? "bg-surface-card" : "bg-bg-elevated"}`}
              >
                <span className="truncate text-sm text-text-secondary">{s.path}</span>
                <span className="shrink-0 text-sm font-semibold text-accent">{s.aufrufe.toLocaleString("de-DE")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
