// IndexNow: informiert Bing/Yandex/Seznam sofort über neue Artikel-URLs,
// statt auf den nächsten regulären Crawl zu warten. Google nimmt nicht am
// IndexNow-Protokoll teil — dafür ist die Google-News-Aufnahme (separates
// Vorhaben) der massgebliche Hebel.
const HOST = "www.republicofpixels.com";
const KEY = "3776be420571c80008e39b128d333d60";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

export async function pingIndexNow(urls) {
  if (!urls.length) return;
  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: KEY_LOCATION,
        urlList: urls,
      }),
    });
    console.log(`  IndexNow: ${res.status} (${urls.length} URL(s))`);
  } catch (err) {
    console.log(`  IndexNow fehlgeschlagen: ${err.message}`);
  }
}
