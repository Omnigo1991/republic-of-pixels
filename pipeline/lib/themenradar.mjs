import { writeFileSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// STORY-RADAR (Tim, 11.08.2026) — internes Redaktionswerkzeug.
//
// WARUM: Unsere Pipeline zieht bei jedem Lauf 42 Quellen, wählt zwei Themen
// aus und VERWIRFT den Rest ersatzlos. Die Information "über dieses Thema
// schreiben gerade sieben Quellen, wir haben nichts dazu" entsteht damit
// alle drei Stunden und verfällt sofort. Genau diese Lücke zwischen dem, was
// passiert, und dem, was bei uns steht, macht der Radar sichtbar.
//
// BEWUSST OHNE CLAUDE: Die Gruppierung passiert hier rein rechnerisch über
// Wortüberschneidung. Gründe: Sie kostet nichts, sie kann nicht an einer
// unbrauchbaren Antwort scheitern, und vor allem greift sie NICHT in die
// Auswahl-Logik ein — der Radar darf den Artikel-Lauf unter keinen Umständen
// gefährden. Nach drei Abenden mit verlorenen Posts ist das die wichtigste
// Eigenschaft dieses Moduls.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ZIEL = join(ROOT, "src", "content", "themenradar.json");
const ARTIKEL_DIR = join(ROOT, "src", "content", "articles");

// Wörter ohne Aussagekraft für die Themenerkennung. Ohne diese Liste würden
// Meldungen allein über "Spiel" oder "neue" zusammenfallen.
const STOPP = new Set([
  "der","die","das","den","dem","des","ein","eine","einen","einem","einer","eines",
  "und","oder","aber","auch","noch","schon","nur","mit","ohne","für","fuer","von",
  "vom","zum","zur","bei","aus","auf","ist","sind","war","waren","wird","werden",
  "hat","haben","kann","können","koennen","soll","sollen","als","wie","was","wer",
  "sich","nicht","mehr","alle","neue","neuer","neues","neu","jetzt","the","for",
  "and","with","new","game","games","spiel","spiele","update","teil","gibt","es",
  "im","in","an","am","zu","so","dass","diese","dieser","dieses","seine","ihre",
]);

function tokens(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-zäöüß0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length >= 3 && !STOPP.has(w));
}

// Zwei Meldungen gehören zum selben Thema, wenn sie sich genügend
// aussagekräftige Wörter teilen. Der Schwellwert ist bewusst streng: Lieber
// zwei getrennte Cluster als ein falsch zusammengeworfenes Thema — ein
// falsches "7 Quellen" wäre schlimmer als zwei Zeilen mit je 3.
// VERSUCH UND RUECKNAHME (11.08.2026): Ich habe zweimal versucht, einen
// einzelnen seltenen Eigennamen als Treffer genuegen zu lassen — die beiden
// Wardogs-Meldungen teilten sich nur den Spielnamen und blieben getrennt.
// Beide Male entstand Kettenbildung: A teilt ein seltenes Wort mit B, B mit
// C, und am Ende hing alles zusammen (erst 25 Quellen in EINEM Cluster, nach
// Verschaerfung noch 17). Zurueck zur strengen Regel. Ein gespaltenes Thema
// ist sichtbar und harmlos; ein Klumpen aus 17 Quellen ist irrefuehrend und
// macht das ganze Werkzeug unglaubwuerdig.
function gehoertZusammen(a, b) {
  const gemeinsam = a.filter((w) => b.includes(w));
  if (gemeinsam.length < 2) return false;
  const kleiner = Math.min(a.length, b.length);
  return gemeinsam.length / Math.max(1, kleiner) >= 0.34;
}



function veroeffentlichteTitel() {
  try {
    return readdirSync(ARTIKEL_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          const a = JSON.parse(readFileSync(join(ARTIKEL_DIR, f), "utf8"));
          return { titel: a.title ?? "", worte: tokens(a.title ?? ""), datum: a.publishedAt ?? null };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

// Haben WIR das Thema schon? Gleiche Wortüberschneidung wie beim Clustern,
// nur gegen unsere eigenen Schlagzeilen. Nur Artikel der letzten 5 Tage
// zählen — ein gleichnamiges Thema von vor drei Wochen ist keine Abdeckung.
function schonAbgedeckt(clusterWorte, artikel) {
  const grenze = Date.now() - 5 * 86400000;
  return artikel.some((a) => {
    const zeit = Date.parse(a.datum ?? "");
    if (Number.isFinite(zeit) && zeit < grenze) return false;
    return gehoertZusammen(clusterWorte, a.worte);
  });
}

export function baueThemenRadar(candidates) {
  const artikel = veroeffentlichteTitel();
  const jetzt = Date.now();

  // Gruppieren: jede Meldung entweder einem bestehenden Cluster zuordnen
  // oder einen neuen aufmachen.
  // GEGEN JEDES MITGLIED VERGLEICHEN, nicht gegen einen verengten Kern
  // (Korrektur beim ersten Testlauf 11.08.2026): Die erste Fassung schnitt
  // die Wortmenge des Clusters bei jeder neuen Meldung auf die Schnittmenge
  // zurück. Dadurch wurde er mit jedem Mitglied enger, spätere Meldungen
  // fielen durch — und dasselbe Thema erschien zweimal in der Liste, einmal
  // als "haben wir" und einmal als "haben wir nicht". Ein gespaltenes Thema
  // ist genauso irreführend wie ein falsch zusammengeworfenes.
  const cluster = [];
  for (const c of candidates) {
    const worte = tokens(c.title);
    if (worte.length < 2) continue;
    const treffer = cluster.find((g) => g.wortlisten.some((w) => gehoertZusammen(w, worte)));
    if (treffer) {
      treffer.meldungen.push(c);
      treffer.wortlisten.push(worte);
      treffer.quellen.add(c.feedId);
    } else {
      cluster.push({ wortlisten: [worte], meldungen: [c], quellen: new Set([c.feedId]) });
    }
  }

  // Zweiter Durchgang: Cluster verschmelzen, die sich über irgendein
  // Mitgliedspaar berühren. Die Reihenfolge der Meldungen entscheidet sonst
  // darüber, ob zwei Teile zueinanderfinden.
  for (let i = 0; i < cluster.length; i++) {
    for (let j = i + 1; j < cluster.length; j++) {
      // Bewusst OHNE Seltenheits-Regel: Beim Verschmelzen ganzer Cluster
      // waere die Kettengefahr am groessten.
      const beruehrt = cluster[i].wortlisten.some((a) =>
        cluster[j].wortlisten.some((b) => gehoertZusammen(a, b))
      );
      if (!beruehrt) continue;
      cluster[i].meldungen.push(...cluster[j].meldungen);
      cluster[i].wortlisten.push(...cluster[j].wortlisten);
      for (const q of cluster[j].quellen) cluster[i].quellen.add(q);
      cluster.splice(j, 1);
      j--;
    }
  }

  const themen = cluster
    .filter((g) => g.quellen.size >= 2) // Eine einzelne Quelle ist kein Thema
    .map((g) => {
      const zeiten = g.meldungen
        .map((m) => (m.publishedAt ? m.publishedAt.getTime() : null))
        .filter((t) => Number.isFinite(t));
      const aeltestes = zeiten.length ? Math.min(...zeiten) : jetzt;
      const spanneStunden = Math.max(0.25, (jetzt - aeltestes) / 3600000);
      // Tempo = Quellen pro Stunde. Sieben Quellen in 40 Minuten sind ein
      // anderes Signal als sieben Quellen über zwei Tage.
      const tempo = g.quellen.size / spanneStunden;
      // Längster Titel als Bezeichnung — er trägt meist die meiste Information.
      const titel = g.meldungen
        .map((m) => m.title)
        .sort((a, b) => b.length - a.length)[0];
      return {
        titel,
        quellen: g.quellen.size,
        meldungen: g.meldungen.length,
        stundenSeitErster: Math.round(spanneStunden * 10) / 10,
        tempo: Math.round(tempo * 10) / 10,
        quellenNamen: [...g.quellen].slice(0, 5),
        beispiele: g.meldungen.slice(0, 3).map((m) => ({ titel: m.title, link: m.link ?? null })),
        abgedeckt: g.wortlisten.some((w) => schonAbgedeckt(w, artikel)),
      };
    })
    .sort((a, b) => b.tempo - a.tempo || b.quellen - a.quellen)
    .slice(0, 12);

  return { stand: new Date().toISOString(), themen };
}

export function schreibeThemenRadar(candidates) {
  try {
    const daten = baueThemenRadar(candidates);
    writeFileSync(ZIEL, JSON.stringify(daten, null, 2) + "\n");
    const offen = daten.themen.filter((t) => !t.abgedeckt).length;
    console.log(`  Story-Radar: ${daten.themen.length} Themen, davon ${offen} noch nicht bei uns.`);
    return daten;
  } catch (err) {
    // Der Radar darf den Lauf NIE gefährden — im Zweifel lieber kein Radar
    // als kein Artikel.
    console.log(`  Story-Radar übersprungen (${err.message})`);
    return null;
  }
}
