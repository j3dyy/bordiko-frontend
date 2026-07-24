import { useCallback, useEffect, useState } from "react";
import {
  adminListGames,
  adminListUsers,
  adminSetGameEnabled,
  adminSetUserDisabled,
  fetchModeration,
  moderateGame,
  fetchGameSource,
  deleteGame,
} from "./api.ts";
import { useT } from "./i18n.tsx";
import type { AdminGame, AdminUser, ModerationGame } from "./wire.ts";

// Status pill colours for the review queue (amber pending, green live, red rejected).
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#facc1522", fg: "#b8860b" },
  published: { bg: "#22c55e22", fg: "#15803d" },
  rejected: { bg: "#ef444422", fg: "#b91c1c" },
};
function StatusPill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span className="admin-pill" style={{ background: s.bg, color: s.fg, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

// The admin panel: enable/disable marketplace games and player accounts. Only
// reachable when /auth/me reported isAdmin (App gates the route), and every
// action is re-checked server-side by the requireAdmin gate.
export function Admin({ myId }: { myId: string }) {
  const { t } = useT();
  const [games, setGames] = useState<AdminGame[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [queue, setQueue] = useState<ModerationGame[] | null>(null);
  const [source, setSource] = useState<{ id: string; version: string; text: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [g, u, q] = await Promise.all([adminListGames(), adminListUsers(), fetchModeration()]);
      setGames(g);
      setUsers(u);
      // Pending first, then newest.
      setQueue(
        q.sort((a, b) => {
          if (a.status !== b.status) return a.status === "pending" ? -1 : b.status === "pending" ? 1 : 0;
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        }),
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  async function review(g: ModerationGame, action: "approve" | "reject") {
    let reason = "";
    if (action === "reject") {
      reason = window.prompt("Reason for rejecting (shown to the developer):", "") ?? "";
    }
    const key = `m:${g.gameId}@${g.version}`;
    mark(key, true);
    try {
      await moderateGame(g.gameId, g.version, action, reason);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      mark(key, false);
    }
  }

  async function removeGame(g: ModerationGame) {
    if (!window.confirm(`Delete ${g.gameId} and all its versions? This can't be undone.`)) return;
    const key = `d:${g.gameId}`;
    mark(key, true);
    try {
      await deleteGame(g.gameId);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      mark(key, false);
    }
  }

  async function removeAdminGame(g: AdminGame) {
    if (!window.confirm(`Delete ${g.id} and all its versions? This can't be undone.`)) return;
    const key = `d:${g.id}`;
    mark(key, true);
    try {
      await deleteGame(g.id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      mark(key, false);
    }
  }

  async function viewSource(g: ModerationGame) {
    try {
      const text = await fetchGameSource(g.gameId, g.version);
      setSource({ id: g.gameId, version: g.version, text });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const mark = (key: string, on: boolean) => setBusy((b) => ({ ...b, [key]: on }));

  async function toggleGame(g: AdminGame) {
    const key = `g:${g.id}`;
    mark(key, true);
    const next = !g.enabled;
    setGames((gs) => gs?.map((x) => (x.id === g.id ? { ...x, enabled: next } : x)) ?? null);
    try {
      await adminSetGameEnabled(g.id, next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      await load(); // roll back to the server's truth
    } finally {
      mark(key, false);
    }
  }

  async function toggleUser(u: AdminUser) {
    const key = `u:${u.id}`;
    mark(key, true);
    const next = !u.disabled;
    setUsers((us) => us?.map((x) => (x.id === u.id ? { ...x, disabled: next } : x)) ?? null);
    try {
      await adminSetUserDisabled(u.id, next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      await load();
    } finally {
      mark(key, false);
    }
  }

  return (
    <div className="admin">
      <h1 className="admin-title">{t("admin.title")}</h1>
      {err && <div className="admin-error">{err}</div>}

      <section className="admin-section">
        <h2 className="admin-h2">Review queue</h2>
        {queue === null ? (
          <div className="admin-loading">
            <span className="spinner small" />
          </div>
        ) : queue.length === 0 ? (
          <p className="admin-empty">No submissions yet.</p>
        ) : (
          <ul className="admin-list">
            {queue.map((g) => (
              <li key={`${g.gameId}@${g.version}`} className="admin-row">
                <div className="admin-row-main">
                  <span className="admin-name">{g.displayName || g.gameId}</span>
                  <span className="admin-sub">
                    {g.gameId}@{g.version} · {g.ownerId ?? "?"} ·{" "}
                    {g.minPlayers === g.maxPlayers ? `${g.minPlayers}p` : `${g.minPlayers}–${g.maxPlayers}p`} ·{" "}
                    {g.board ?? "?"} · src {g.sourceBytes ?? 0}B
                    {g.status === "rejected" && g.rejectReason ? ` · reason: ${g.rejectReason}` : ""}
                  </span>
                </div>
                <StatusPill status={g.status} />
                <button className="admin-toggle" onClick={() => void viewSource(g)}>
                  View source
                </button>
                {g.status !== "published" && (
                  <button
                    className="admin-toggle go"
                    disabled={busy[`m:${g.gameId}@${g.version}`]}
                    onClick={() => void review(g, "approve")}
                  >
                    Approve
                  </button>
                )}
                {g.status !== "rejected" && (
                  <button
                    className="admin-toggle danger"
                    disabled={busy[`m:${g.gameId}@${g.version}`]}
                    onClick={() => void review(g, "reject")}
                  >
                    Reject
                  </button>
                )}
                <button
                  className="admin-toggle danger"
                  disabled={busy[`d:${g.gameId}`]}
                  onClick={() => void removeGame(g)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {source && (
        <div className="modal-backdrop" onClick={() => setSource(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: "min(900px, 92vw)", width: "900px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>
                Source · {source.id}@{source.version}
              </h3>
              <button className="ghost small" onClick={() => setSource(null)}>
                Close
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                maxHeight: "70vh",
                overflow: "auto",
                fontFamily: "ui-monospace, monospace",
                fontSize: 13,
                lineHeight: 1.5,
                whiteSpace: "pre",
                background: "rgba(0,0,0,0.04)",
                padding: 12,
                borderRadius: 8,
              }}
            >
              {source.text}
            </pre>
          </div>
        </div>
      )}

      <section className="admin-section">
        <h2 className="admin-h2">{t("admin.games")}</h2>
        {games === null ? (
          <div className="admin-loading">
            <span className="spinner small" />
          </div>
        ) : games.length === 0 ? (
          <p className="admin-empty">{t("admin.noGames")}</p>
        ) : (
          <ul className="admin-list">
            {games.map((g) => (
              <li key={g.id} className={`admin-row${g.enabled ? "" : " off"}`}>
                <div className="admin-row-main">
                  <span className="admin-name">{g.displayName || g.id}</span>
                  <span className="admin-sub">
                    {g.id} · {g.minPlayers === g.maxPlayers ? `${g.minPlayers}p` : `${g.minPlayers}–${g.maxPlayers}p`}
                  </span>
                </div>
                <span className={`admin-pill ${g.enabled ? "on" : "off"}`}>
                  {g.enabled ? t("admin.enabled") : t("admin.disabled")}
                </span>
                <button
                  className={`admin-toggle ${g.enabled ? "danger" : "go"}`}
                  disabled={busy[`g:${g.id}`]}
                  onClick={() => toggleGame(g)}
                >
                  {g.enabled ? t("admin.disable") : t("admin.enable")}
                </button>
                <button
                  className="admin-toggle danger"
                  disabled={busy[`d:${g.id}`]}
                  onClick={() => void removeAdminGame(g)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-section">
        <h2 className="admin-h2">{t("admin.users")}</h2>
        {users === null ? (
          <div className="admin-loading">
            <span className="spinner small" />
          </div>
        ) : users.length === 0 ? (
          <p className="admin-empty">{t("admin.noUsers")}</p>
        ) : (
          <ul className="admin-list">
            {users.map((u) => {
              const isSelf = u.id === myId;
              return (
                <li key={u.id} className={`admin-row${u.disabled ? " off" : ""}`}>
                  <div className="admin-row-main">
                    <span className="admin-name">
                      {u.displayName || u.id}
                      {u.admin && <span className="admin-badge">{t("admin.adminBadge")}</span>}
                      {isSelf && <span className="admin-you">{t("admin.you")}</span>}
                    </span>
                    <span className="admin-sub">{u.email || u.id}</span>
                  </div>
                  <span className={`admin-pill ${u.disabled ? "off" : "on"}`}>
                    {u.disabled ? t("admin.disabled") : t("admin.enabled")}
                  </span>
                  <button
                    className={`admin-toggle ${u.disabled ? "go" : "danger"}`}
                    disabled={busy[`u:${u.id}`] || isSelf}
                    title={isSelf ? t("admin.cantSelf") : undefined}
                    onClick={() => toggleUser(u)}
                  >
                    {u.disabled ? t("admin.enableUser") : t("admin.disableUser")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
