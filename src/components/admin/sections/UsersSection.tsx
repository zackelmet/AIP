"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faUsers,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

const PAGE_SIZE = 25;

export default function UsersSection() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/admin/users?limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setUsers(d.users || []);
      })
      .catch((e) => setError(e.message || "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        const da = a.createdAt || "";
        const db = b.createdAt || "";
        return db.localeCompare(da);
      }),
    [users],
  );

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      sorted.filter((u) => {
        if (!q) return true;
        const email = (u.email || "").toLowerCase();
        const name = (u.name || "").toLowerCase();
        return email.includes(q) || name.includes(q);
      }),
    [sorted, q],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="neon-card p-6 space-y-4 max-w-5xl">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faUsers} className="text-green-theme" />
        <h2 className="text-lg font-semibold text-[var(--text)]">Users</h2>
        {!loading && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#34D399]/15 text-green-theme">
            {users.length}
          </span>
        )}
      </div>

      <div className="relative">
        <FontAwesomeIcon
          icon={faSearch}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by email or name"
          className="neon-input w-full py-2.5 px-10 text-sm"
          autoFocus
        />
      </div>

      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">Loading users…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : (
        <>
          <div className="overflow-x-auto" style={{ userSelect: "text" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="text-left py-2 pr-3 font-semibold">Email</th>
                  <th className="text-left py-2 pr-3 font-semibold">Name</th>
                  <th className="text-center py-2 pr-3 font-semibold">Admin</th>
                  <th className="text-right py-2 pr-3 font-semibold">
                    web_app
                  </th>
                  <th className="text-right py-2 pr-3 font-semibold">
                    external_ip
                  </th>
                  <th className="text-right py-2 pr-3 font-semibold">
                    pentest_plus
                  </th>
                  <th className="text-right py-2 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td
                      className="py-2 pr-3 text-[var(--text)] truncate max-w-48"
                      style={{ userSelect: "text" }}
                    >
                      {u.email}
                    </td>
                    <td className="py-2 pr-3 text-[var(--text-muted)] truncate max-w-32">
                      {u.name || "—"}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {u.isAdmin ? "✓" : ""}
                    </td>
                    <td className="py-2 pr-3 text-right text-[var(--text-muted)] whitespace-nowrap">
                      {(u.credits?.web_app ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right text-[var(--text-muted)] whitespace-nowrap">
                      {(u.credits?.external_ip ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3 text-right text-[var(--text-muted)] whitespace-nowrap">
                      {(u.credits?.pentest_plus ?? 0).toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-[var(--text-muted)] whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paged.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] py-4">
                No users match your search.
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="neon-outline-btn px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="w-3 h-3" />
              </button>
              <span className="text-xs text-[var(--text-muted)]">
                Page {page} of {totalPages} ({filtered.length} users)
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="neon-outline-btn px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
