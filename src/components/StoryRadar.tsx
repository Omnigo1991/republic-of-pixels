"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { MASTER_NICKNAME } from "@/lib/ranking";
import radar from "@/content/themenradar.json";

// STORY-RADAR (Tim, 11.08.2026) — internes Redaktionswerkzeug.
//
// Zeigt die Lücke zwischen dem, was in unseren 42 Quellen passiert, und dem,
// was bei uns steht. Die Daten entstehen bei jedem Pipeline-Lauf in
// pipeline/lib/themenradar.mjs — vorher wurden sie ersatzlos verworfen.
//
// HINWEIS ZUR VERTRAULICHKEIT: Die Daten liegen in einer JSON-Datei, die in
// das Bündel dieser Route wandert. Sie sind damit nicht geheim, sondern nur
// nicht verlinkt. Dort stehen ausschliesslich fremde Schlagzeilen und
// Quellennamen.

interface Thema {
  titel: string;
  quellen: number;
  meldungen: number;
  stundenSeitErster: number;
  tempo: number;
  quellenNamen: string[];
  beispiele: { titel: string; link: string | null }[];
  abgedeckt: boolean;
}

export function StoryRadar() {
  const supabase = useMemo(() => getSupabase(), []);
  const themen = (radar.themen ?? []) as Thema[];

  const [session, setSession] = useState<Session | null>(null);
  const [istMaster, setIstMaster] = useState<boolean | null>(null);
  // Offene Aufträge aus der DATENBANK statt aus dem Seitenzustand (Tim,
  // 11.08.2026): Vorher lebte "in der Warteschlange" nur im Browser und war
  // nach dem Neuladen weg — man konnte munter weiterklicken, ohne zu sehen,
  // dass schon ein Auftrag lief.
  const [warteschlange, setWarteschlange] = useState<string[] | null>(null);
  const [sendet, setSendet] = useState<string | null>(null);
  const [fehler, setFehler] = useState(false);

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

  const ladeWarteschlange = useCallback(async () => {
    const seit = new Date(Date.now() - 24 * 3600000).toISOString();
    const { data, error } = await supabase
      .from("themen_auftraege")
      .select("titel")
      .eq("erledigt", false)
      .gte("created_at", seit);
    if (error) {
      setFehler(true);
      setWarteschlange([]);
      return;
    }
    setWarteschlange((data ?? []).map((r) => r.titel as string));
  }, [supabase]);

  useEffect(() => {
    if (istMaster) ladeWarteschlange();
  }, [istMaster, ladeWarteschlange]);

  async function nachziehen(t: Thema) {
    setSendet(t.titel);
    const { error } = await supabase.from("themen_auftraege").insert({
      titel: t.titel,
      quellen: t.quellen,
      hinweise: t.beispiele.map((b) => b.titel).join(" | ").slice(0, 1000),
    });
    setSendet(null);
    if (error) setFehler(true);
    else await ladeWarteschlange();
  }

  if (!session || istMaster === false) {
    return <Hinweis>Dieser Bereich ist der Redaktion vorbehalten.</Hinweis>;
  }
  if (istMaster === null || warteschlange === null) {
    return <Hinweis>Wird geladen …</Hinweis>;
  }
  if (themen.length === 0) {
    return <Hinweis>Noch keine Themen erfasst — der Radar füllt sich beim nächsten Lauf.</Hinweis>;
  }

  // EIN AUFTRAG ZUR ZEIT (Tim, 11.08.2026): Die Pipeline verarbeitet ohnehin
  // höchstens einen Auftrag pro Lauf. Solange einer offen ist, sind alle
  // übrigen Knöpfe gesperrt — sonst sammelt sich eine Liste an, von der die
  // meisten Einträge nach 24 Stunden verfallen, und man klickt im Glauben,
  // es passiere etwas.
  const auftragOffen = warteschlange.length > 0;

  return (
    <div className="space-y-2.5">
      {auftragOffen && (
        <p className="rounded-2xl border border-accent/30 bg-accent/[0.06] px-4 py-3 text-xs text-accent">
          Ein Auftrag ist in der Warteschlange. Die nächste Auswahl wird möglich, sobald der
          nächste Lauf ihn abgearbeitet hat — die Pipeline nimmt höchstens einen pro Lauf.
        </p>
      )}

      {themen.map((t) => {
        const inWarteschlange = warteschlange.includes(t.titel);
        const laeuft = sendet === t.titel;
        return (
          <div
            key={t.titel}
            className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-border-subtle bg-surface-card p-4 sm:grid-cols-[1fr_9.5rem_9.5rem] sm:gap-4 sm:p-5"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{t.titel}</p>
              <p className="mt-1 text-xs text-text-tertiary">
                {t.quellen} Quellen in {t.stundenSeitErster} Std. · {t.quellenNamen.join(", ")}
              </p>
            </div>

            {/* FESTE SPALTENBREITEN (Tim, 11.08.2026): Vorher richtete sich die
                Position des Balkens nach der Titellänge — jede Zeile sass
                anders. Jetzt stehen Balken und Knopf in allen Zeilen exakt
                untereinander, auf dem Desktop wie auf dem Handy. */}
            <div
              className="flex items-center justify-end gap-2.5"
              title={`${t.quellen} Quellen in ${t.stundenSeitErster} Stunden`}
            >
              <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-border-subtle">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(5, Math.min(100, (t.tempo / 5) * 100))}%` }}
                />
              </div>
              <span className="w-[5.25rem] shrink-0 text-right text-xs font-semibold tabular-nums text-accent">
                {t.tempo.toLocaleString("de-CH", { maximumFractionDigits: 1 })} Q/Std.
              </span>
            </div>

            <div className="flex justify-end">
              {t.abgedeckt ? (
                <Pille art="ruhig">VERÖFFENTLICHT</Pille>
              ) : inWarteschlange ? (
                <Pille art="cyan">IN WARTESCHLANGE</Pille>
              ) : (
                <button
                  onClick={() => nachziehen(t)}
                  disabled={auftragOffen || laeuft}
                  title={
                    auftragOffen
                      ? "Erst möglich, wenn der offene Auftrag abgearbeitet ist"
                      : undefined
                  }
                  className="inline-flex w-full items-center justify-center rounded-full border border-error/50 bg-error/10 px-3 py-1.5 text-[10px] font-bold tracking-wider text-error transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:border-border-default disabled:bg-surface-hover disabled:text-text-disabled disabled:hover:opacity-100"
                >
                  {laeuft ? "…" : "NACHZIEHEN"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      {fehler && (
        <p className="text-xs text-error">
          Die Warteschlange ist nicht erreichbar — wurde schema-v10.sql schon ausgeführt?
        </p>
      )}
      <p className="pt-1 text-xs text-text-tertiary">
        Stand vor {Math.round((Date.now() - new Date(radar.stand).getTime()) / 60000)} Minuten ·
        aktualisiert sich mit jedem Pipeline-Lauf
      </p>
    </div>
  );
}

function Hinweis({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-border-subtle bg-surface-card p-5 text-sm text-text-tertiary">
      {children}
    </p>
  );
}

// Gleiche Bauart wie der Knopf daneben: gleiche Höhe, gleiche Rundung,
// gleicher Zeichenabstand, volle Spaltenbreite — nur die Farbe unterscheidet
// sich. So sitzen alle drei Zustände exakt deckungsgleich untereinander.
function Pille({ art, children }: { art: "ruhig" | "cyan"; children: React.ReactNode }) {
  const farbe =
    art === "cyan"
      ? "border-accent/40 bg-accent/10 text-accent"
      : "border-border-default bg-surface-hover text-text-tertiary";
  return (
    <span
      className={`inline-flex w-full items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-bold tracking-wider ${farbe}`}
    >
      {children}
    </span>
  );
}
