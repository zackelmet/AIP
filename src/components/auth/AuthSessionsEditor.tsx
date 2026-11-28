"use client";

import type { AuthKind } from "@/lib/security/authBundle";

export interface AuthSessionDraft {
  label: string;
  kind: AuthKind;
  token: string;
  cookie: string;
  checkUrl: string;
}

export const emptyAuthSession = (): AuthSessionDraft => ({
  label: "",
  kind: "bearer",
  token: "",
  cookie: "",
  checkUrl: "",
});

export default function AuthSessionsEditor({
  value,
  onChange,
  max = 5,
}: {
  value: AuthSessionDraft[];
  onChange: (next: AuthSessionDraft[]) => void;
  max?: number;
}) {
  const update = (index: number, patch: Partial<AuthSessionDraft>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const loadCookieFile = async (index: number, file: File) => {
    const text = await file.text();
    let cookie = "";
    try {
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed?.cookies)
        ? parsed.cookies
        : Array.isArray(parsed)
          ? parsed
          : [];
      cookie = rows
        .filter((c: any) => c && c.name && c.value !== undefined)
        .map((c: any) => `${c.name}=${c.value}`)
        .join("; ");
    } catch {
      cookie = text
        .split(/\r?\n/)
        .filter(
          (line) =>
            line && (!line.startsWith("#") || line.startsWith("#HttpOnly_")),
        )
        .map((line) => {
          const parts = line.replace(/^#HttpOnly_/, "").split("\t");
          return parts.length >= 7 ? `${parts[5]}=${parts[6]}` : "";
        })
        .filter(Boolean)
        .join("; ");
    }
    if (cookie) update(index, { cookie });
  };

  return (
    <div className="space-y-3">
      {value.map((row, index) => (
        <div
          key={index}
          className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4 space-y-3"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_150px_1fr_auto]">
            <input
              value={row.label}
              onChange={(e) => update(index, { label: e.target.value })}
              placeholder="Role label (e.g. admin)"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/20"
              autoComplete="off"
            />
            <select
              value={row.kind}
              onChange={(e) =>
                update(index, {
                  kind: e.target.value as AuthKind,
                  token: "",
                  cookie: "",
                })
              }
              className="theme-select w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/20"
            >
              <option value="bearer">Bearer token</option>
              <option value="cookie">Cookie header</option>
            </select>
            <input
              value={row.checkUrl}
              onChange={(e) => update(index, { checkUrl: e.target.value })}
              placeholder="Protected URL (401 signed out, 200 signed in)"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/20"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-muted)] hover:border-red-500/50 hover:text-red-500"
            >
              Remove
            </button>
          </div>
          {row.kind === "bearer" ? (
            <input
              type="password"
              value={row.token}
              onChange={(e) => update(index, { token: e.target.value })}
              placeholder="Bearer token (stored encrypted, never shown in reports)"
              className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/20"
              autoComplete="off"
            />
          ) : (
            <div className="space-y-2">
              <textarea
                rows={2}
                value={row.cookie}
                onChange={(e) => update(index, { cookie: e.target.value })}
                placeholder="Cookie header from a signed-in session: session=...; other=..."
                className="w-full rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/20"
                autoComplete="off"
              />
              <input
                type="file"
                accept=".txt,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void loadCookieFile(index, file);
                }}
                className="text-xs text-[var(--text-muted)]"
              />
            </div>
          )}
        </div>
      ))}
      {value.length < max && (
        <button
          type="button"
          onClick={() => onChange([...value, emptyAuthSession()])}
          className="rounded-lg border border-[#34D399]/40 bg-[#34D399]/10 px-4 py-2 text-sm font-medium text-[var(--text-green)] hover:bg-[#34D399]/20"
        >
          + Add session
        </button>
      )}
    </div>
  );
}
