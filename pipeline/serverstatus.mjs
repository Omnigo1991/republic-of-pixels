import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// SERVER-RADAR (Tim, 11.08.2026): Fragt die offiziellen Statusquellen der
// grossen Plattformen und Live-Service-Spiele ab und schreibt das Ergebnis
// nach src/content/serverstatus.json.
//
// AUSWAHL MIT SYSTEM, NICHT ZUFAELLIG: Aufgenommen wird nur, wofuer es eine
// offizielle, maschinenlesbare Quelle gibt. Zwanzig Kandidaten wurden am
// 11.08.2026 geprueft; sechs bestanden. Bewusst NICHT dabei:
//   - Steam: hat gar keine offizielle Statusquelle. Der bekannte Dienst
//     steamstat.us sperrt automatisierte Abrufe (403). Lieber kein Eintrag
//     als eine falsche Entwarnung - wer bei uns "alles online" liest und
//     trotzdem nicht reinkommt, kommt nicht wieder.
//   - Blizzard, Roblox, Minecraft: nichts oeffentlich Zugaengliches.
//   - Rockstar, EA, Ubisoft: liefen in Zeitueberschreitungen, noch offen.
//
// Grundsatz: Im Zweifel "unbekannt" melden statt zu raten.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ZIEL = join(ROOT, "src", "content", "serverstatus.json");
// Warteschlange fuer erkannte Stoerungen - bewusst NICHT unter src/content,
// weil sie kein Seiteninhalt ist, sondern ein Auftrag an die Pipeline.
const MELDUNGEN = join(ROOT, "pipeline", "stoerungen.json");
const UA = "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com)";

// Einheitliche Zustaende: online | beeintraechtigt | stoerung | wartung | unbekannt
const DIENSTE = [
  {
    id: "psn",
    name: "PlayStation Network",
    plattform: "PlayStation",
    url: "https://status.playstation.com/data/statuses/region/SCEE.json",
    lesen: (d) => {
      // ACHTUNG (Fehlalarm am 11.08.2026 beim ersten Lauf): "status" ist ein
      // ARRAY, kein Text. Ein LEERES Array heisst "keine Vorfaelle". Die
      // erste Fassung prüfte `s.status && s.status !== "operational"` - ein
      // leeres Array ist in JavaScript wahr, also meldete sie fuer JEDEN
      // Dienst eine Stoerung. Ausserdem heisst das Namensfeld serviceName,
      // nicht name. Nur nicht-leere status-Arrays zaehlen.
      const alle = (d?.countries ?? []).flatMap((c) => c?.services ?? []);
      if (!alle.length) return { zustand: "unbekannt", detail: "Keine Angaben" };
      const betroffen = alle.filter((s) => Array.isArray(s?.status) && s.status.length > 0);
      if (!betroffen.length) return { zustand: "online", detail: "Alle Dienste" };
      const texte = betroffen.flatMap((s) => s.status.map((x) => String(x?.statusType ?? "")));
      const wartung = texte.some((t) => /maintenance/i.test(t));
      return {
        zustand: wartung ? "wartung" : "stoerung",
        detail:
          betroffen.map((s) => s.serviceName).filter(Boolean).slice(0, 2).join(", ") ||
          `${betroffen.length} Dienst(e)`,
      };
    },
  },
  {
    id: "xbox",
    name: "Xbox Live",
    plattform: "Xbox",
    url: "https://xnotify.xboxlive.com/servicestatusv6/US/en-US",
    lesen: (d) => {
      const status = d?.Status?.Overall?.State ?? d?.Status?.Overall?.Status;
      if (!status) return { zustand: "unbekannt", detail: "Keine Angaben" };
      if (/^(none|impacted-none|healthy|good)$/i.test(String(status))) {
        return { zustand: "online", detail: "Alle Dienste" };
      }
      return { zustand: "stoerung", detail: String(status) };
    },
  },
  {
    id: "nintendo",
    name: "Nintendo Switch Online",
    plattform: "Nintendo",
    url: "https://www.nintendo.co.jp/netinfo/en_US/status.json",
    lesen: (d) => {
      // ACHTUNG (Fehlalarm am 11.08.2026 beim ersten Lauf): Nintendo listet
      // Wartungen WOCHEN im Voraus. Die erste Fassung meldete deshalb
      // "Wartung", obwohl die naechste erst sechs Tage spaeter begann. Als
      // Wartung gilt jetzt nur ein Fenster, das GERADE laeuft; ein
      // kuenftiges wird als Hinweis genannt, der Zustand bleibt online.
      const laufend = (d?.operational_statuses ?? []).length;
      if (laufend > 0) return { zustand: "stoerung", detail: `${laufend} Dienst(e) betroffen` };

      const zeit = (s) => {
        // Format: "Monday, August 17, 2026 10 :00 PM" - das Leerzeichen vor
        // dem Doppelpunkt macht Date.parse sonst unbrauchbar.
        const t = Date.parse(String(s ?? "").replace(/\s+:/, ":"));
        return Number.isFinite(t) ? t : null;
      };
      const jetzt = Date.now();
      const fenster = (d?.temporary_maintenances ?? [])
        .map((m) => ({ von: zeit(m.begin), bis: zeit(m.end) }))
        .filter((f) => f.von !== null);

      const aktiv = fenster.find((f) => f.von <= jetzt && (f.bis ?? jetzt) >= jetzt);
      if (aktiv) return { zustand: "wartung", detail: "Wartung laeuft" };

      const naechstes = fenster.filter((f) => f.von > jetzt).sort((a, b) => a.von - b.von)[0];
      if (naechstes) {
        const datum = new Intl.DateTimeFormat("de-CH", {
          timeZone: "Europe/Zurich",
          day: "2-digit",
          month: "2-digit",
        }).format(new Date(naechstes.von));
        return { zustand: "online", detail: `Wartung geplant am ${datum}` };
      }
      return { zustand: "online", detail: "Alle Dienste" };
    },
  },
  {
    id: "fortnite",
    name: "Fortnite",
    plattform: "Epic Games",
    url: "https://status.epicgames.com/api/v2/status.json",
    lesen: (d) => statuspage(d),
  },
  {
    id: "valorant",
    name: "Valorant",
    plattform: "Riot (Europa)",
    url: "https://valorant.secure.dyn.riotcdn.net/channels/public/x/status/eu.json",
    lesen: (d) => {
      // ACHTUNG (Fehlalarm am 11.08.2026 beim ersten Lauf): Riot laesst alte
      // Hinweise monatelang in der Liste stehen. Beim ersten Lauf zaehlte
      // ich alle drei "incidents" als Stoerung - zwei stammten aus dem
      // Maerz und trugen die Stufe "info". Gezaehlt wird jetzt nur, was
      // wirklich stoert (warning/critical) UND in den letzten 24 Stunden
      // angelegt oder aktualisiert wurde.
      const frisch = (e) => {
        const zeit = Date.parse(e?.updated_at ?? e?.created_at ?? "");
        return Number.isFinite(zeit) && Date.now() - zeit < 24 * 3600000;
      };
      const stufe = (e) => String(e?.incident_severity ?? e?.severity ?? "").toLowerCase();
      const aktive = (d?.incidents ?? []).filter((e) => frisch(e) && stufe(e) !== "info");
      const kritisch = aktive.filter((e) => stufe(e) === "critical");
      const wartungen = (d?.maintenances ?? []).filter(frisch);
      if (kritisch.length) return { zustand: "stoerung", detail: `${kritisch.length} kritischer Vorfall` };
      if (aktive.length) return { zustand: "beeintraechtigt", detail: `${aktive.length} Vorfall/Vorfaelle` };
      if (wartungen.length) return { zustand: "wartung", detail: "Wartung angekuendigt" };
      return { zustand: "online", detail: "EU-Server" };
    },
  },
  {
    id: "destiny2",
    name: "Destiny 2",
    plattform: "Bungie",
    url: "https://www.bungie.net/Platform/Settings/",
    lesen: (d) => {
      // Bungie meldet Wartung ueber ein Flag in den Systemeinstellungen.
      const sys = d?.Response?.systems ?? {};
      const d2 = sys?.Destiny2 ?? sys?.D2Profiles;
      if (d2 && d2.enabled === false) return { zustand: "wartung", detail: "Wartungsmodus" };
      if (d?.ErrorCode && d.ErrorCode !== 1) {
        return { zustand: "stoerung", detail: String(d.ErrorStatus ?? "Fehler") };
      }
      return { zustand: "online", detail: "Alle Plattformen" };
    },
  },
];

// Statuspage.io liefert ueberall dieselbe Struktur - einmal auswerten reicht.
function statuspage(d) {
  const ind = d?.status?.indicator;
  const beschreibung = d?.status?.description ?? "";
  if (!ind) return { zustand: "unbekannt", detail: "Keine Angaben" };
  if (ind === "none") return { zustand: "online", detail: "Alle Dienste" };
  if (ind === "minor") return { zustand: "beeintraechtigt", detail: beschreibung };
  if (ind === "maintenance") return { zustand: "wartung", detail: beschreibung };
  return { zustand: "stoerung", detail: beschreibung };
}

async function hole(url, versuche = 3) {
  for (let i = 0; i < versuche; i++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const roh = await res.text();
      if (!roh.trim()) throw new Error("leere Antwort");
      return JSON.parse(roh);
    } catch (err) {
      if (i === versuche - 1) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

async function main() {
  const eintraege = [];
  for (const dienst of DIENSTE) {
    try {
      const daten = await hole(dienst.url);
      const { zustand, detail } = dienst.lesen(daten);
      eintraege.push({ id: dienst.id, name: dienst.name, plattform: dienst.plattform, zustand, detail });
      console.log(`  ${dienst.name.padEnd(24)} ${zustand}${detail ? " - " + detail : ""}`);
    } catch (err) {
      // Quelle nicht erreichbar heisst NICHT "Dienst gestoert" - das waere
      // eine Falschmeldung. Wir sagen ehrlich, dass wir es nicht wissen.
      eintraege.push({
        id: dienst.id,
        name: dienst.name,
        plattform: dienst.plattform,
        zustand: "unbekannt",
        detail: "Quelle nicht erreichbar",
      });
      console.log(`  ${dienst.name.padEnd(24)} unbekannt (${err.message})`);
    }
  }

  // NEUE Störungen erkennen (Tim, 11.08.2026): Der Radar ist als Leser-
  // Feature schwach - Downdetector besetzt diese Suchanfragen seit Jahren
  // und hat mit Nutzermeldungen ein Signal, das wir nicht haben. Als
  // ARTIKEL-AUSLÖSER ist er dagegen stark: Wir sind eine Nachrichtenseite,
  // und "PSN gestört" innerhalb einer Minute zu melden, während andere
  // Redaktionen erst jemanden erreichen müssen, ist genau unser
  // Geschwindigkeitsvorteil. Darum interessiert uns nicht der Zustand,
  // sondern der WECHSEL nach "stoerung".
  let vorher = {};
  try {
    const alt = JSON.parse(readFileSync(ZIEL, "utf8"));
    for (const d of alt.dienste ?? []) vorher[d.id] = d.zustand;
  } catch {
    // Erster Lauf - dann gibt es nichts zu vergleichen.
  }
  const neueStoerungen = eintraege.filter(
    (e) => e.zustand === "stoerung" && vorher[e.id] && vorher[e.id] !== "stoerung"
  );

  writeFileSync(
    ZIEL,
    JSON.stringify({ stand: new Date().toISOString(), dienste: eintraege }, null, 2) + "\n"
  );

  if (neueStoerungen.length) {
    // Warteschlange für die Artikel-Erzeugung. Bewusst eine eigene Datei
    // statt eines direkten Aufrufs: So kann der Pipeline-Lauf sie aufgreifen,
    // ohne dass ein Fehler hier den ganzen Lauf mitreisst.
    writeFileSync(
      MELDUNGEN,
      JSON.stringify(
        { erkanntAm: new Date().toISOString(), dienste: neueStoerungen },
        null,
        2
      ) + "\n"
    );
    for (const s of neueStoerungen) {
      console.log(`::warning::Neue Störung erkannt: ${s.name} - ${s.detail}`);
    }
  }

  const gestoert = eintraege.filter((e) => e.zustand === "stoerung").length;
  console.log(
    `Server-Status geschrieben (${eintraege.length} Dienste, ${gestoert} Störung(en), ${neueStoerungen.length} neu).`
  );
}

main().catch((err) => {
  console.log(`Server-Status fehlgeschlagen: ${err.message}`);
  process.exitCode = 1;
});
