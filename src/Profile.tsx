import { useEffect, useMemo, useState } from "react";
import { fetchCatalog, fetchLeaderboard, fetchMyGames, generatePublishToken, revokePublishTokens, setMyGameEnabled, setUsername } from "./api.ts";
import { useAuth } from "./auth.tsx";
import { useT } from "./i18n.tsx";
import { gameMeta } from "./games.ts";
import type { LeaderRow, ModerationGame, User } from "./wire.ts";

// Status pill colours for a developer's own submissions.
const MG_PILL: Record<string, { bg: string; fg: string }> = {
  pending: { bg: "#facc1522", fg: "#b8860b" },
  published: { bg: "#22c55e22", fg: "#15803d" },
  rejected: { bg: "#ef444422", fg: "#b91c1c" },
};

interface GameStat extends LeaderRow {
  gameId: string;
}

// The player's profile: identity + their per-game ranking across every game they
// have played. Assembled client-side from the per-game leaderboards.
export function Profile({
  user,
  onOpenGame,
  onBack,
}: {
  user: User;
  onOpenGame: (gameId: string) => void;
  onBack: () => void;
}) {
  const [stats, setStats] = useState<GameStat[]>([]);
  const [mine, setMine] = useState<ModerationGame[]>([]);
  const [loading, setLoading] = useState(true);
  const { refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user.displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameErr, setNameErr] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [tokenErr, setTokenErr] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateToken() {
    setTokenErr("");
    try {
      setToken((await generatePublishToken()).token);
    } catch (e) {
      setTokenErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function revokeTokens() {
    if (!window.confirm("Revoke all your publish tokens? Any CLI still using one will stop working.")) return;
    setTokenErr("");
    try {
      await revokePublishTokens();
      setToken(null);
    } catch (e) {
      setTokenErr(e instanceof Error ? e.message : String(e));
    }
  }
  async function toggleMine(g: ModerationGame) {
    const next = !(g.enabled ?? true);
    setMine((ms) => ms.map((x) => (x.gameId === g.gameId ? { ...x, enabled: next } : x)));
    try {
      await setMyGameEnabled(g.gameId, next);
    } catch {
      setMine((ms) => ms.map((x) => (x.gameId === g.gameId ? { ...x, enabled: !next } : x)));
    }
  }
  const { t } = useT();

  async function saveName() {
    const name = nameInput.trim();
    if (!name || name === user.displayName) {
      setEditing(false);
      return;
    }
    setSavingName(true);
    setNameErr("");
    try {
      await setUsername(name);
      await refresh(); // update the name everywhere (topbar, board labels use the session)
      setEditing(false);
    } catch (e) {
      setNameErr((e as Error).message || "Couldn't save name.");
    } finally {
      setSavingName(false);
    }
  }

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const catalog = await fetchCatalog();
        const perGame = await Promise.all(
          catalog.map(async (g) => {
            const rows = await fetchLeaderboard(g.id).catch(() => [] as LeaderRow[]);
            const mine = rows.find((r) => r.userId === user.id);
            return mine ? ({ ...mine, gameId: g.id } as GameStat) : null;
          }),
        );
        if (live) setStats(perGame.filter((s): s is GameStat => s !== null));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [user.id]);

  // The user's own game submissions (deduped to the newest version per game).
  useEffect(() => {
    let live = true;
    fetchMyGames()
      .then((rows) => {
        const byGame = new Map<string, ModerationGame>();
        for (const r of rows) {
          const prev = byGame.get(r.gameId);
          if (!prev || (r.createdAt ?? "") > (prev.createdAt ?? "")) byGame.set(r.gameId, r);
        }
        if (live) setMine([...byGame.values()].sort((a, b) => a.gameId.localeCompare(b.gameId)));
      })
      .catch(() => live && setMine([]));
    return () => {
      live = false;
    };
  }, [user.id]);

  const totals = useMemo(() => {
    const wins = stats.reduce((n, s) => n + s.wins, 0);
    const losses = stats.reduce((n, s) => n + s.losses, 0);
    const draws = stats.reduce((n, s) => n + s.draws, 0);
    const games = stats.reduce((n, s) => n + s.games, 0);
    const decided = wins + losses;
    return { wins, losses, draws, games, winPct: decided ? Math.round((wins / decided) * 100) : 0 };
  }, [stats]);

  return (
    <div className="profile">
      <button className="back" onClick={onBack}>{t("detail.back")}</button>

      <section className="profile-head">
        {user.avatarUrl ? (
          <img className="profile-avatar" src={user.avatarUrl} alt="" />
        ) : (
          <span className="profile-avatar ph">{(user.displayName.trim()[0] ?? "?").toUpperCase()}</span>
        )}
        <div className="profile-id">
          {editing ? (
            <div className="name-edit">
              <input
                autoFocus
                value={nameInput}
                maxLength={24}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveName();
                  if (e.key === "Escape") setEditing(false);
                }}
                aria-label="display name"
              />
              <button onClick={() => void saveName()} disabled={savingName}>
                {savingName ? t("profile.saving") : t("profile.save")}
              </button>
              <button className="ghost" onClick={() => { setEditing(false); setNameInput(user.displayName); setNameErr(""); }} disabled={savingName}>
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <h1 className="profile-name">
              {user.displayName}
              <button className="name-edit-btn" onClick={() => { setNameInput(user.displayName); setEditing(true); }}>
                {t("profile.editName")}
              </button>
            </h1>
          )}
          {nameErr && <div className="error">{nameErr}</div>}
          <div className="profile-provider">{t(`profile.${user.id.split(":")[0]}`, undefined, providerLabel(user.id))}</div>
        </div>
        <div className="profile-totals">
          <div className="stat-tile"><div className="stat-num">{stats.length}</div><div className="stat-lbl">{t("profile.games")}</div></div>
          <div className="stat-tile"><div className="stat-num">{totals.games.toLocaleString()}</div><div className="stat-lbl">{t("profile.matches")}</div></div>
          <div className="stat-tile"><div className="stat-num">{totals.games ? `${totals.winPct}%` : "—"}</div><div className="stat-lbl">{t("profile.winRate")}</div></div>
        </div>
      </section>

      <h3 className="section-title">{t("profile.yourGames")}</h3>
      {loading ? (
        <p className="hint">{t("profile.loadingStats")}</p>
      ) : stats.length === 0 ? (
        <p className="hint">{t("profile.noStats")}</p>
      ) : (
        <div className="profile-games">
          {stats.map((s) => {
            const m = gameMeta(s.gameId);
            const decided = s.wins + s.losses;
            return (
              <button className="profile-game" key={s.gameId} onClick={() => onOpenGame(s.gameId)} style={{ ["--accent" as string]: m.accent }}>
                <span className="pg-emoji">{m.emoji}</span>
                <div className="pg-info">
                  <div className="pg-name">{m.name}</div>
                  <div className="pg-record">{t("profile.record", { w: s.wins, l: s.losses, d: s.draws })}</div>
                </div>
                <div className="pg-nums">
                  <div className="pg-rating">{s.rating}</div>
                  <div className="pg-win">{decided ? `${Math.round((s.wins / decided) * 100)}%` : "—"}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {mine.length > 0 && (
        <>
          <h3 className="section-title">Games you've published</h3>
          <div className="profile-games">
            {mine.map((g) => {
              const pill = MG_PILL[g.status] ?? MG_PILL.pending;
              const clickable = g.status === "published";
              const live = g.enabled ?? true;
              return (
                <div
                  className="profile-game"
                  key={g.gameId}
                  style={{ ["--accent" as string]: gameMeta(g.gameId).accent, display: "flex", alignItems: "center" }}
                >
                  <button
                    onClick={() => clickable && onOpenGame(g.gameId)}
                    disabled={!clickable}
                    style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, background: "none", border: "none", padding: 0, font: "inherit", color: "inherit", textAlign: "left", cursor: clickable ? "pointer" : "default" }}
                  >
                    <span className="pg-emoji">{gameMeta(g.gameId).emoji}</span>
                    <div className="pg-info">
                      <div className="pg-name">{g.displayName || g.gameId}</div>
                      <div className="pg-record">
                        {g.gameId}@{g.version}
                        {g.status === "rejected" && g.rejectReason ? ` · ${g.rejectReason}` : ""}
                      </div>
                    </div>
                  </button>
                  {g.status === "published" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: live ? "#15803d" : "#b91c1c" }}>{live ? "Live" : "Disabled"}</span>
                      <button className="ghost small" onClick={() => void toggleMine(g)}>{live ? "Disable" : "Enable"}</button>
                    </span>
                  ) : (
                    <span
                      style={{
                        background: pill.bg, color: pill.fg, padding: "2px 9px", borderRadius: 999,
                        fontSize: 12, fontWeight: 700, textTransform: "capitalize", marginLeft: 8,
                      }}
                    >
                      {g.status}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <h3 className="section-title">Publish from the CLI</h3>
      <div className="cli-token">
        <p className="hint">
          Generate a personal access token to publish games you own from the CLI (they enter the review queue).
          It's shown once — treat it like a password. Revoke any time; revoking stops every token from working.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="ghost" onClick={() => void generateToken()}>{token ? "Regenerate token" : "Generate publish token"}</button>
          <button className="ghost small" onClick={() => void revokeTokens()}>Revoke all tokens</button>
        </div>
        {token && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap", marginTop: 8 }}>
            <code
              style={{
                flex: "1 1 320px", whiteSpace: "pre-wrap", wordBreak: "break-all",
                background: "rgba(0,0,0,0.06)", padding: "10px 12px", borderRadius: 8,
                fontSize: 12, fontFamily: "ui-monospace, monospace",
              }}
            >
              BORDIKO_TOKEN={token} npx @bordiko/cli publish
            </code>
            <button
              className="ghost small"
              onClick={() => {
                void navigator.clipboard.writeText(`BORDIKO_TOKEN=${token} npx @bordiko/cli publish`);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        )}
        {tokenErr && <p className="error">{tokenErr}</p>}
      </div>
    </div>
  );
}

function providerLabel(id: string): string {
  const p = id.split(":")[0];
  return { google: "Google account", github: "GitHub account", dev: "Guest (dev)" }[p] ?? p;
}
