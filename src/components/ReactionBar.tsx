"use client";

import { useState } from "react";

// Reaktionen sind bewusst ohne Login möglich (niedrige Hürde, siehe docs/konzept.md §10).
// UI ist bereits voll funktionsfähig (optimistic local state); die Zählerstände werden
// live, sobald die Supabase-Anbindung steht — Interface bleibt dabei unverändert.
const REACTIONS = [
  { key: "like", emoji: "👍", label: "Gefällt mir" },
  { key: "dislike", emoji: "👎", label: "Gefällt mir nicht" },
  { key: "love", emoji: "❤️", label: "Liebe ich" },
  { key: "hype", emoji: "🔥", label: "Hype" },
  { key: "interesting", emoji: "🤔", label: "Interessant" },
  { key: "disappointing", emoji: "😕", label: "Enttäuschend" },
] as const;

type ReactionKey = (typeof REACTIONS)[number]["key"];

export function ReactionBar({
  initialCounts = {},
}: {
  initialCounts?: Partial<Record<ReactionKey, number>>;
}) {
  const [counts, setCounts] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    REACTIONS.forEach((r) => (base[r.key] = initialCounts[r.key] ?? 0));
    return base;
  });
  const [selected, setSelected] = useState<ReactionKey | null>(null);

  function toggle(key: ReactionKey) {
    setCounts((prev) => {
      const next = { ...prev };
      if (selected === key) {
        next[key] = Math.max(0, next[key] - 1);
        setSelected(null);
      } else {
        if (selected) next[selected] = Math.max(0, next[selected] - 1);
        next[key] = next[key] + 1;
        setSelected(key);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {REACTIONS.map((r) => (
        <button
          key={r.key}
          onClick={() => toggle(r.key)}
          className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors ${
            selected === r.key
              ? "border-accent bg-accent/10 text-accent"
              : "border-border-default bg-surface-card text-text-secondary hover:border-border-strong hover:text-text-primary"
          }`}
        >
          <span>{r.emoji}</span>
          <span className="hidden sm:inline">{r.label}</span>
          {counts[r.key] > 0 && <span className="text-xs text-text-tertiary">{counts[r.key]}</span>}
        </button>
      ))}
    </div>
  );
}
