// Deal-Radar-Datenbeschaffung: holt die aktuellen Steam-Angebote
// (offizieller Store-Endpoint, EUR-Preise, kein API-Schlüssel nötig)
// und schreibt sie nach src/content/deals.json. Läuft als Schritt der
// News-Pipeline - die Deals werden also im 3-Stunden-Takt aktualisiert.
// Nur PC/Steam: Für PSN/eShop/Xbox existieren keine sauberen freien APIs.
import { writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "content", "deals.json");

const res = await fetch("https://store.steampowered.com/api/featuredcategories?cc=de&l=german", {
  headers: { "User-Agent": "RepublicOfPixelsBot/1.0 (+https://www.republicofpixels.com)" },
  signal: AbortSignal.timeout(20000),
});
if (!res.ok) {
  console.error(`Steam-API antwortet mit ${res.status} - deals.json bleibt unverändert.`);
  process.exit(0); // Pipeline nicht blockieren, alte Deals bleiben stehen
}
const data = await res.json();
const items = data?.specials?.items ?? [];

const gesehen = new Set();
const deals = items
  .filter((it) => it.discounted && it.discount_percent > 0 && it.original_price && it.final_price)
  .filter((it) => (gesehen.has(it.id) ? false : gesehen.add(it.id)))
  .sort((a, b) => b.discount_percent - a.discount_percent)
  .slice(0, 6)
  .map((it) => ({
    appId: it.id,
    title: it.name,
    discountPercent: it.discount_percent,
    originalPrice: it.original_price,
    finalPrice: it.final_price,
    currency: it.currency ?? "EUR",
    endsAt: it.discount_expiration ? new Date(it.discount_expiration * 1000).toISOString() : null,
    url: `https://store.steampowered.com/app/${it.id}/`,
    // Offizielles Steam-Kapselbild (CDN-Hotlink, setzt keine Cookies) -
    // bewusst nicht lokal gespiegelt, sonst würde jeder 3-Std.-Lauf
    // Binärdateien ins Repo committen.
    image: it.small_capsule_image ?? it.large_capsule_image ?? null,
  }));

// Nur schreiben, wenn sich die Angebote inhaltlich geändert haben -
// sonst löst jeder Lauf wegen updatedAt/Cache-Bust-Parametern (?t= im
// Bild-URL) einen sinnlosen Commit + Deploy aus. Vergleich über die
// Deals ohne flüchtige Bestandteile.
const normalisiert = (liste) =>
  JSON.stringify(liste.map((d) => ({ ...d, image: d.image?.split("?")[0] ?? null })));

let bestehend = [];
try {
  bestehend = JSON.parse(readFileSync(OUT, "utf8")).deals ?? [];
} catch {
  // keine bestehende Datei - wird neu geschrieben
}

if (normalisiert(bestehend) === normalisiert(deals)) {
  console.log("Deals unverändert - deals.json bleibt wie sie ist.");
} else {
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), deals }, null, 2) + "\n");
  console.log(`deals.json geschrieben: ${deals.length} Angebote`);
}
