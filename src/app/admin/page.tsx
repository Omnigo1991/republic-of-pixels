"use client";

import { useState } from "react";
import { getAllArticles } from "@/lib/articles";
import { CATEGORY_LABELS } from "@/lib/types";
import { Logo } from "@/components/Logo";

// Admin-Backend-Grundgerüst (siehe docs/konzept.md §11). Diese Seite ist bewusst als
// eigenständiger Bereich ausserhalb der öffentlichen Navigation angelegt (robots.ts blockt
// /admin für Suchmaschinen) und zeigt die vorgesehene Struktur mit den echten Artikeldaten.
// Schreibende Aktionen sind UI-fertig, aber erst nach Datenbank-Anbindung funktional.

type Tab = "artikel" | "kommentare" | "nutzer" | "einstellungen";

const MOCK_REPORTED = [
  { id: "c1", article: "Xbox streicht 3.200 Stellen …", author: "Gast_2291", text: "Textausschnitt eines gemeldeten Kommentars …", reason: "Spam-Verdacht" },
  { id: "c2", article: "GTA 6 Trailer-Gerüchte im August", author: "hype_lord", text: "Textausschnitt eines gemeldeten Kommentars …", reason: "Beleidigung" },
];

const MOCK_USERS = [
  { id: "u1", name: "Jana K.", rank: "Ratsmitglied", badges: ["Scharfsinn", "Gründungsmitglied"], status: "aktiv" },
  { id: "u2", name: "Marco_PS", rank: "Bürger:in", badges: [], status: "aktiv" },
  { id: "u3", name: "hype_lord", rank: "Neuankömmling", badges: [], status: "beobachtet" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("artikel");
  const [articles, setArticles] = useState(() => getAllArticles());

  function toggleTopStory(slug: string) {
    setArticles((prev) =>
      prev.map((a) => ({ ...a, isTopStory: a.slug === slug ? !a.isTopStory : false }))
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="border-b border-border-subtle bg-bg-elevated">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Logo size="sm" withWordmark={false} />
            <span className="text-sm font-semibold tracking-wide text-text-tertiary">REDAKTIONS-BACKEND</span>
          </div>
          <span className="rounded-full border border-border-default px-3 py-1 text-xs text-text-tertiary">
            Demo-Modus — keine Datenbank verbunden
          </span>
        </div>
        <div className="mx-auto flex max-w-content gap-1 px-4 sm:px-6">
          {(
            [
              ["artikel", "Artikel"],
              ["kommentare", "Kommentare"],
              ["nutzer", "Nutzer"],
              ["einstellungen", "Einstellungen"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-content px-4 sm:px-6 py-8">
        {tab === "artikel" && (
          <div className="overflow-x-auto rounded-2xl border border-border-subtle">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-card text-left text-xs text-text-tertiary">
                  <th className="px-4 py-3 font-medium">Titel</th>
                  <th className="px-4 py-3 font-medium">Kategorie</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Top-Story</th>
                  <th className="px-4 py-3 font-medium">Beliebt-Rang</th>
                  <th className="px-4 py-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.slug} className="border-b border-border-subtle last:border-0">
                    <td className="max-w-xs truncate px-4 py-3 text-text-primary">{a.title}</td>
                    <td className="px-4 py-3 text-text-secondary">{CATEGORY_LABELS[a.category]}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs text-success">
                        veröffentlicht
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleTopStory(a.slug)}
                        className={`rounded-full px-2.5 py-1 text-xs border transition-colors ${
                          a.isTopStory
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border-default text-text-tertiary hover:text-text-secondary"
                        }`}
                      >
                        {a.isTopStory ? "Ist Top-Story" : "Setzen"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{a.popularityRank ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button className="text-text-tertiary hover:text-accent transition-colors" title="Backend folgt">
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "kommentare" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-tertiary">Gemeldete Kommentare — Warteschlange</p>
            {MOCK_REPORTED.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border-subtle bg-surface-card p-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">{c.author}</span>
                  <span className="rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                    {c.reason}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{c.text}</p>
                <p className="mt-1 text-xs text-text-tertiary">unter „{c.article}“</p>
                <div className="mt-4 flex gap-2">
                  <button className="rounded-full border border-border-default px-3.5 py-1.5 text-xs text-text-secondary hover:border-success/50 hover:text-success transition-colors">
                    Freigeben
                  </button>
                  <button className="rounded-full border border-border-default px-3.5 py-1.5 text-xs text-text-secondary hover:border-error/50 hover:text-error transition-colors">
                    Entfernen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "nutzer" && (
          <div className="overflow-x-auto rounded-2xl border border-border-subtle">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-card text-left text-xs text-text-tertiary">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Rang</th>
                  <th className="px-4 py-3 font-medium">Badges</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_USERS.map((u) => (
                  <tr key={u.id} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-3 text-text-primary">{u.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{u.rank}</td>
                    <td className="px-4 py-3 text-text-tertiary">{u.badges.join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs ${
                          u.status === "aktiv"
                            ? "border-success/40 bg-success/10 text-success"
                            : "border-warning/40 bg-warning/10 text-warning"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "einstellungen" && (
          <div className="max-w-lg rounded-2xl border border-border-subtle bg-surface-card p-6">
            <p className="mb-4 text-sm font-semibold text-text-primary">Cookie-Kategorien</p>
            {["Notwendig", "Funktional", "Analyse"].map((cat) => (
              <div key={cat} className="flex items-center justify-between border-b border-border-subtle py-3 last:border-0">
                <span className="text-sm text-text-secondary">{cat}</span>
                <span className="text-xs text-text-tertiary">
                  {cat === "Notwendig" ? "immer aktiv" : "einstellbar"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
