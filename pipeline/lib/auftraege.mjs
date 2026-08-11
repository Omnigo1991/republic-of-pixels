// Warteschlange des Story-Radars (Tim, 11.08.2026).
//
// Ein Klick auf "Nachziehen" im Cockpit legt einen Auftrag in der Tabelle
// themen_auftraege ab (supabase/schema-v10.sql). Dieses Modul holt ihn im
// Pipeline-Lauf ab.
//
// SCHADENSBEGRENZUNG DURCH BAUWEISE — Tims Sorge war, mit einem Klick das
// System lahmzulegen. Vier Regeln verhindern das:
//   1. HÖCHSTENS EIN Auftrag pro Lauf. Zwanzig Klicks fluten die Seite nicht.
//   2. Aufträge verfallen nach 24 Stunden. Ein vergessener Klick loest nicht
//      Tage spaeter einen sinnlosen Artikel aus.
//   3. Der Auftrag ist eine BEVORZUGUNG, keine Abkuerzung: Der Artikel
//      durchlaeuft dieselben Pruefungen wie jeder andere.
//   4. Jeder Fehler hier wird geschluckt. Im Zweifel lieber kein Auftrag als
//      kein Artikel — dieselbe Regel wie beim Server-Status.

const URL_BASIS = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SCHLUESSEL = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MAX_ALTER_H = 24;

function kopf() {
  return { apikey: SCHLUESSEL, Authorization: `Bearer ${SCHLUESSEL}` };
}

// Liefert { id, titel, hinweise } oder null. Wirft NIE.
export async function holeAuftrag() {
  if (!URL_BASIS || !SCHLUESSEL) return null;
  try {
    const seit = new Date(Date.now() - MAX_ALTER_H * 3600000).toISOString();
    const url =
      `${URL_BASIS}/rest/v1/themen_auftraege` +
      `?select=id,titel,hinweise&erledigt=eq.false&created_at=gte.${seit}` +
      `&order=created_at.asc&limit=1`;
    const res = await fetch(url, { headers: kopf(), signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const zeilen = await res.json();
    const a = Array.isArray(zeilen) ? zeilen[0] : null;
    if (!a?.titel) return null;
    console.log(`  Story-Radar-Auftrag gefunden: "${String(a.titel).slice(0, 70)}"`);
    return a;
  } catch {
    return null;
  }
}

// Auftrag abhaken. Wirft NIE — ein nicht abgehakter Auftrag ist harmlos
// (er verfaellt nach 24 Stunden), ein abgebrochener Lauf waere es nicht.
export async function erledigeAuftrag(id) {
  if (!URL_BASIS || !SCHLUESSEL || !id) return;
  try {
    await fetch(`${URL_BASIS}/rest/v1/themen_auftraege?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...kopf(), "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ erledigt: true }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    // still ignorieren
  }
}
