export const dynamic = "force-dynamic";

// Auslöser der News-Pipeline (Stand 07.08.2026, Takt: alle 3 Stunden):
// - Vercel-Cron (täglich, Hobby-Plan) ruft mit "Authorization: Bearer <CRON_SECRET>" auf.
// - Ein externer Gratis-Pinger (cron-job.org, stündlich) ruft mit ?key=<PING_KEY> auf.
// Sicherheit: Vor jedem Dispatch wird der letzte Workflow-Lauf bei GitHub geprüft -
// liegt er weniger als 170 Minuten zurück, wird übersprungen. Der weiterhin
// stündliche externe Ping verpufft dadurch wirkungslos (kein Eingriff bei
// cron-job.org nötig), und mutwilliges Dauerfeuer auf diese URL kann nie mehr
// als ~1 Lauf pro 3 Stunden auslösen. Der eigentliche Taktgeber ist der
// GitHub-Actions-Schedule (news-pipeline.yml, cron "23 */3 * * *").
const PING_KEY = "rop-hourly-x7k2m9pq4";
const MIN_INTERVAL_MS = 170 * 60 * 1000;
const REPO = "Omnigo1991/republic-of-pixels";
const WORKFLOW = "news-pipeline.yml";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization");
  const viaCronSecret =
    !!process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`;
  const viaPingKey = url.searchParams.get("key") === PING_KEY;
  if (!viaCronSecret && !viaPingKey) {
    return new Response("Unauthorized", { status: 401 });
  }

  const ghHeaders = {
    Authorization: `Bearer ${process.env.GH_WORKFLOW_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "rop-pipeline-trigger",
  };

  // Rate-Limit: letzter Lauf < 170 Min → nicht erneut auslösen.
  // WICHTIG: fail-closed. Die frühere fail-open-Variante (bei
  // fehlgeschlagener Prüfung trotzdem dispatchen) hat den 3-Stunden-Takt
  // ausgehebelt - der stündliche externe Ping kam ungebremst durch und
  // die Pipeline lief weiter stündlich (entdeckt 07.08.2026). Kann die
  // Route den letzten Lauf nicht verifizieren, löst sie NICHT aus; der
  // GitHub-Schedule (alle 3 Std.) ist ohnehin der primäre Taktgeber.
  // cache: "no-store" ist hier ESSENZIELL: Next.js cached fetch()-Antworten
  // in Route-Handlern standardmässig im Data Cache - ohne no-store verglich
  // der Guard gegen eine eingefrorene, tagealte "letzter Lauf"-Antwort und
  // liess deshalb jeden Ping durch (die eigentliche Wurzel des
  // Stunden-Takt-Bugs vom 07.08.2026).
  const lastRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/runs?per_page=1`,
    { headers: ghHeaders, cache: "no-store" }
  );
  if (!lastRes.ok) {
    return Response.json({
      triggered: false,
      skipped: `Letzter-Lauf-Prüfung fehlgeschlagen (HTTP ${lastRes.status}) - vorsichtshalber kein Dispatch`,
    });
  }
  const data = await lastRes.json();
  const last = data.workflow_runs?.[0]?.created_at;
  if (!last) {
    return Response.json({
      triggered: false,
      skipped: "Kein bisheriger Lauf auffindbar - vorsichtshalber kein Dispatch (GitHub-Schedule übernimmt)",
    });
  }
  if (Date.now() - new Date(last).getTime() < MIN_INTERVAL_MS) {
    return Response.json({ triggered: false, skipped: "Letzter Lauf ist jünger als 170 Minuten" });
  }

  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: { ...ghHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }),
    }
  );

  return Response.json(
    { triggered: res.status === 204, githubStatus: res.status },
    { status: res.status === 204 ? 200 : 502 }
  );
}
