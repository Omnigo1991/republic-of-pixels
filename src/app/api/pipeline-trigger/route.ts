export const dynamic = "force-dynamic";

// Plan B für die Pipeline-Auslösung (05.08.2026): GitHubs Schedule-Trigger
// feuerte trotz Neuregistrierung nie. Stattdessen ruft ein Vercel-Cron
// (vercel.json) diese Route stündlich auf; sie startet den GitHub-Workflow
// per workflow_dispatch. Vercel sendet automatisch "Authorization: Bearer
// <CRON_SECRET>", sobald die Umgebungsvariable CRON_SECRET existiert.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const res = await fetch(
    "https://api.github.com/repos/Omnigo1991/republic-of-pixels/actions/workflows/news-pipeline.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GH_WORKFLOW_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "rop-pipeline-trigger",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );

  return Response.json(
    { triggered: res.status === 204, githubStatus: res.status },
    { status: res.status === 204 ? 200 : 502 }
  );
}
