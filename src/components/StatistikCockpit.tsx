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
  // Verletzte Rechenregeln (leer = alle Zahlen in sich stimmig).
  widersprueche: string[];
}

// Rückgabezeilen der Statistik-Funktionen aus supabase/schema-v9.sql.
interface VerlaufZeile {
  tag: string; // YYYY-MM-DD, Zürcher Kalendertag
  aufrufe: number;
  besucher: number;
}
// schema-v10 liefert gruppierte Zeilen (referrer, ist_ig, besucher).
// schema-v9 lieferte eine Zeile PRO BESUCHER (visitor, referrer, path).
// Beide Formen werden gelesen, damit das Cockpit auch dann richtig anzeigt,
// wenn schema-v10.sql im SQL-Editor noch nicht ausgefuehrt wurde.
interface HerkunftZeile {
  referrer: string | null;
  ist_ig?: boolean;
  besucher?: number;
  path?: string;
}

// Herkunfts-Klassifikation: der erste Aufruf eines Besuchers in den letzten
// 7 Tagen bestimmt seine Quelle. Landet jemand ohne Referrer direkt auf /ig,
// kam er über den Instagram-Bio-Link (In-App-Browser senden oft keinen
// Referrer). Alte Einträge ohne referrer-Spalte zählen als "Direkt".
function quelleVon(referrer: string | null, istIg: boolean): string {
  const ref = (referrer ?? "").toLowerCase();
  if (ref.includes("instagram.") || istIg) return "Instagram";
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
      // AUSWAHL UND GRUPPIERUNG machen beide die Datenbank (schema-v10).
      // Vorher kam eine Zeile pro BESUCHER in den Browser — das lief in
      // dieselbe Zeilengrenze wie der Fehler vom 13.08., nur an anderer
      // Stelle: Die Herkunfts-Summe blieb dann hinter der Kachel
      // "Besucher 7 Tage" zurueck. Jetzt kommen nur noch so viele Zeilen,
      // wie es verschiedene Referrer gibt.
      const { data: refRows, error: refError } = await supabase.rpc(
        "statistik_herkunft",
        { seit: iso(jetzt - 7 * 86400000) },
      );
      if (refError) throw refError;
      const quellen = new Map<string, number>();
      for (const r of (refRows ?? []) as HerkunftZeile[]) {
        // Alte Form: ein Besucher je Zeile, Kennzeichen steckt im Pfad.
        const istIg = r.ist_ig ?? r.path === "/ig";
        const anzahlBesucher = r.besucher ?? 1;
        const q = quelleVon(r.referrer ?? null, istIg);
        quellen.set(q, (quellen.get(q) ?? 0) + anzahlBesucher);
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

      // ZAHLEN RECHNEN SICH SELBST NACH (Tim, 14.08.2026).
      //
      // Am 13.08. stand "Besucher 7 Tage" hoeher als "Besucher gesamt" —
      // rechnerisch unmoeglich. Aufgefallen ist es nur, weil Tim hingesehen
      // hat. Eine Zahl, die niemand nachrechnet, ist eine Zahl, der man
      // nicht trauen kann.
      //
      // Diese Regeln MUESSEN immer gelten. Wird eine verletzt, stimmt die
      // Erhebung nicht — dann steht das sichtbar im Cockpit, statt dass wir
      // auf das naechste Bauchgefuehl warten.
      const herkunftSumme = herkunft.reduce((n, h) => n + h.besucher, 0);
      const regeln: [boolean, string][] = [
        [heute <= tage7, "Aufrufe heute groesser als 7 Tage"],
        [tage7 <= tage30, "Aufrufe 7 Tage groesser als 30 Tage"],
        [tage30 <= gesamt, "Aufrufe 30 Tage groesser als gesamt"],
        [besucherHeute <= besucher7, "Besucher heute mehr als 7 Tage"],
        [besucher7 <= besucher30, "Besucher 7 Tage mehr als 30 Tage"],
        [besucher30 <= besucherGesamt, "Besucher 30 Tage mehr als gesamt"],
        [besucherHeute <= heute, "mehr Besucher als Aufrufe (heute)"],
        [besucher7 <= tage7, "mehr Besucher als Aufrufe (7 Tage)"],
        [besucher30 <= tage30, "mehr Besucher als Aufrufe (30 Tage)"],
        [besucherGesamt <= gesamt, "mehr Besucher als Aufrufe (gesamt)"],
        [
          herkunftSumme === besucher7,
          `Herkunft zaehlt ${herkunftSumme} Besucher, die Kachel oben ${besucher7}`,
        ],
      ];
      const widersprueche = regeln.filter(([ok]) => !ok).map(([, text]) => text);

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
        widersprueche,
      });
      setStand(new Date());
      setFehler(null);
    } catch {
      // ALTE ZAHLEN NICHT ALS AKTUELL AUSGEBEN (Fund 14.08.2026): Bisher
      // wurde hier nur eine Meldung gesetzt und die zuletzt geladenen Zahlen
      // blieben unveraendert stehen — inklusive der Zeitangabe "Stand".
      // Faellt eine Aktualisierung aus, sieht das Cockpit dann aus wie
      // immer, nur bewegt sich nichts mehr. Genau so entsteht der Eindruck,
      // die Zahlen wuerden "manchmal stehenbleiben".
      setFehler(
        "Zahlen konnten nicht aktualisiert werden. Angezeigt wird der letzte erfolgreiche Stand — nicht der aktuelle."
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

      {zahlen && zahlen.widersprueche.length > 0 && (
        <div className="mt-4 rounded-2xl border border-warning/60 bg-warning/10 p-5">
          <p className="text-sm font-semibold text-text-primary">
            Diese Zahlen widersprechen sich — bitte nicht verwenden:
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-text-secondary">
            {zahlen.widersprueche.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
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
