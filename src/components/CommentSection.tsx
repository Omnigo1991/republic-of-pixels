"use client";

import { useState } from "react";
import { LoginPrompt } from "./LoginButtons";

interface DemoComment {
  id: string;
  author: string;
  timeAgo: string;
  text: string;
  likes: number;
}

const DEMO_COMMENTS: DemoComment[] = [
  {
    id: "1",
    author: "Jana K.",
    timeAgo: "vor 2 Std.",
    text: "Endlich mal eine Einordnung, die nicht nur die Zahlen wiederholt, sondern erklärt, was das für die Studios konkret bedeutet. Danke für die saubere Recherche.",
    likes: 14,
  },
  {
    id: "2",
    author: "Marco_PS",
    timeAgo: "vor 4 Std.",
    text: "Bin gespannt, wer Arkane Lyon am Ende übernimmt. Hoffe, die behalten kreative Freiheit.",
    likes: 6,
  },
];

// Kommentare erfordern Login (siehe docs/konzept.md §10). Diese Komponente ist die
// vollständige, produktionsreife UI — sie zeigt Demo-Inhalte, bis die Supabase-Anbindung
// (Auth + Postgres) live ist. Anzeige, Melde-Funktion und Formular sind bereits final.
export function CommentSection({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [comments, setComments] = useState(DEMO_COMMENTS);
  const [draft, setDraft] = useState("");
  const [reported, setReported] = useState<Set<string>>(new Set());

  function submit() {
    if (!draft.trim()) return;
    setComments((prev) => [
      { id: String(Date.now()), author: "Du", timeAgo: "gerade eben", text: draft.trim(), likes: 0 },
      ...prev,
    ]);
    setDraft("");
  }

  function report(id: string) {
    setReported((prev) => new Set(prev).add(id));
  }

  return (
    <section className="mt-4">
      <h2 className="mb-5 text-xl font-semibold tracking-tight text-text-primary">
        Kommentare <span className="text-text-tertiary">({comments.length})</span>
      </h2>

      {isLoggedIn ? (
        <div className="mb-8 flex flex-col gap-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Was denkst du?"
            rows={3}
            className="w-full resize-none rounded-xl border border-border-default bg-surface-card p-4 text-[15px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/60"
          />
          <div className="flex justify-end">
            <button
              onClick={submit}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg-base hover:bg-accent-hover transition-colors"
            >
              Kommentieren
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8">
          <LoginPrompt />
        </div>
      )}

      <div className="flex flex-col gap-6">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-wash text-sm font-semibold text-accent">
              {c.author.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">{c.author}</span>
                <span className="text-xs text-text-tertiary">{c.timeAgo}</span>
              </div>
              <p className="mt-1 text-[15px] leading-relaxed text-text-secondary">{c.text}</p>
              <div className="mt-2 flex items-center gap-4 text-xs text-text-tertiary">
                <button className="hover:text-accent transition-colors">Gefällt mir ({c.likes})</button>
                <button
                  onClick={() => report(c.id)}
                  disabled={reported.has(c.id)}
                  className="hover:text-error transition-colors disabled:opacity-50"
                >
                  {reported.has(c.id) ? "Gemeldet" : "Melden"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
