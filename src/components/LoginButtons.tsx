"use client";

// UI-Vorbereitung für Login (Google/Apple/E-Mail) und Kommentare — siehe docs/konzept.md §10.
// Funktionslos, bis ein Supabase-Projekt (Auth + Postgres) hinterlegt ist; Interface bleibt
// beim Anschluss unverändert, es wird nur die echte Anbindung ergänzt.
export function LoginPrompt({ context = "zu kommentieren" }: { context?: string }) {
  return (
    <div className="rounded-2xl border border-border-default bg-surface-card p-6 text-center">
      <p className="mb-5 text-[15px] text-text-secondary">
        Melde dich an, um {context}.
      </p>
      <div className="mx-auto flex max-w-xs flex-col gap-3">
        <button className="flex items-center justify-center gap-2.5 rounded-xl border border-border-default bg-bg-elevated py-2.5 text-sm font-medium text-text-primary hover:border-border-strong transition-colors">
          <GoogleIcon className="h-4 w-4" /> Mit Google fortfahren
        </button>
        <button className="flex items-center justify-center gap-2.5 rounded-xl border border-border-default bg-bg-elevated py-2.5 text-sm font-medium text-text-primary hover:border-border-strong transition-colors">
          <AppleIcon className="h-4 w-4" /> Mit Apple fortfahren
        </button>
        <button className="flex items-center justify-center gap-2.5 rounded-xl border border-border-default bg-bg-elevated py-2.5 text-sm font-medium text-text-primary hover:border-border-strong transition-colors">
          Mit E-Mail fortfahren
        </button>
      </div>
      <p className="mt-4 text-xs text-text-tertiary">
        Mit der Anmeldung akzeptierst du unsere Community-Regeln.
      </p>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.19 3.32v2.77h3.55c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.55-2.77c-.98.66-2.23 1.06-3.73 1.06-2.87 0-5.3-1.94-6.16-4.53H2.18v2.85A11 11 0 0012 23z" />
      <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.12-1.43.34-2.09V7.06H2.18A11 11 0 001 12c0 1.77.42 3.45 1.18 4.94l3.66-2.85z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 002.18 7.06l3.66 2.85C6.7 7.32 9.13 5.38 12 5.38z" />
    </svg>
  );
}
function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M16.365 1.43c0 1.14-.462 2.19-1.222 2.98-.834.87-2.2 1.55-3.36 1.46-.14-1.09.46-2.24 1.19-2.98.83-.87 2.28-1.53 3.39-1.46zM20.51 17.11c-.55 1.27-.82 1.84-1.53 2.96-.99 1.56-2.39 3.5-4.12 3.52-1.54.02-1.94-.99-4.02-.98-2.09.01-2.53 1-4.07.98-1.73-.02-3.06-1.77-4.05-3.33C.53 16.87.02 13.19 1.4 10.53c.98-1.87 2.75-3.06 4.66-3.09 1.64-.03 3.19 1.1 4.19 1.1 1 0 2.88-1.36 4.85-1.16.83.03 3.15.33 4.64 2.53-.12.08-2.77 1.62-2.75 4.84.03 3.87 3.42 5.16 3.52 5.36z" />
    </svg>
  );
}
