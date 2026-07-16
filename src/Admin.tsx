import { useCallback, useEffect, useState } from "react";
import {
  adminListGames,
  adminListUsers,
  adminSetGameEnabled,
  adminSetUserDisabled,
} from "./api.ts";
import { useT } from "./i18n.tsx";
import type { AdminGame, AdminUser } from "./wire.ts";

// The admin panel: enable/disable marketplace games and player accounts. Only
// reachable when /auth/me reported isAdmin (App gates the route), and every
// action is re-checked server-side by the requireAdmin gate.
export function Admin({ myId }: { myId: string }) {
  const { t } = useT();
  const [games, setGames] = useState<AdminGame[] | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [g, u] = await Promise.all([adminListGames(), adminListUsers()]);
      setGames(g);
      setUsers(u);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

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
