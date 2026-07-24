import { useEffect, useMemo, useState } from "react";
import { fetchCatalog, fetchDeveloper, fetchLeaderboard } from "./api.ts";
import { gameMeta } from "./games.ts";
import type { DeveloperProfile as DevProfile, LeaderRow } from "./wire.ts";

interface GameStat extends LeaderRow {
  gameId: string;
}

// A user's PUBLIC profile: their name, the games they've published, and their
// play record. Reached from a game's creator line or a leaderboard row.
export function DeveloperProfile({
  id,
  onOpenGame,
  onBack,
}: {
  id: string;
  onOpenGame: (gameId: string) => void;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<DevProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GameStat[]>([]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchDeveloper(id)
      .then((p) => live && setProfile(p))
      .catch(() => live && setProfile(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id]);

  // This user's ranking across every game they've played — assembled from the
  // per-game leaderboards, exactly like the signed-in Profile does its own.
  useEffect(() => {
    let live = true;
    setStats([]);
    (async () => {
      const catalog = await fetchCatalog().catch(() => []);
      const perGame = await Promise.all(
        catalog.map(async (g) => {
          const rows = await fetchLeaderboard(g.id).catch(() => [] as LeaderRow[]);
          const row = rows.find((r) => r.userId === id);
          return row ? ({ ...row, gameId: g.id } as GameStat) : null;
        }),
      );
      if (live) setStats(perGame.filter((s): s is GameStat => s !== null));
    })();
    return () => {
      live = false;
    };
  }, [id]);

  const totals = useMemo(() => {
    const wins = stats.reduce((n, s) => n + s.wins, 0);
    const losses = stats.reduce((n, s) => n + s.losses, 0);
    const games = stats.reduce((n, s) => n + s.games, 0);
    const decided = wins + losses;
    return { wins, losses, games, winPct: decided ? Math.round((wins / decided) * 100) : 0 };
  }, [stats]);

  const name = profile?.displayName || friendly(id);

  return (
    <div className="profile">
      <button className="ghost" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <section className="profile-head">
        <div className="profile-avatar ph">{initial(name)}</div>
        <div className="profile-id">
          <h1 className="profile-name">{name}</h1>
          <div className="profile-provider">Developer</div>
        </div>
        <div className="profile-totals">
          <div className="stat-tile"><div className="stat-num">{profile?.games.length ?? 0}</div><div className="stat-lbl">Published</div></div>
          <div className="stat-tile"><div className="stat-num">{totals.games.toLocaleString()}</div><div className="stat-lbl">Matches</div></div>
          <div className="stat-tile"><div className="stat-num">{totals.games ? `${totals.winPct}%` : "—"}</div><div className="stat-lbl">Win rate</div></div>
        </div>
      </section>

      <h3 className="section-title">Published games</h3>
      {loading ? (
        <p className="hint">Loading…</p>
      ) : !profile || profile.games.length === 0 ? (
        <p className="hint">No published games yet.</p>
      ) : (
        <div className="profile-games">
          {profile.games.map((g) => {
            const m = gameMeta(g.id);
            return (
              <button
                className="profile-game"
                key={g.id}
                onClick={() => onOpenGame(g.id)}
                style={{ ["--accent" as string]: m.accent }}
              >
                <span className="pg-emoji">{m.emoji}</span>
                <div className="pg-info">
                  <div className="pg-name">{g.displayName || m.name}</div>
                  <div className="pg-record">
                    {g.minPlayers === g.maxPlayers ? `${g.minPlayers} players` : `${g.minPlayers}–${g.maxPlayers} players`} · {g.board}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <h3 className="section-title">Play record</h3>
      {stats.length === 0 ? (
        <p className="hint">No ranked games yet.</p>
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
                  <div className="pg-record">{s.wins}W · {s.losses}L · {s.draws}D</div>
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
    </div>
  );
}

function initial(name: string): string {
  return (name.trim()[0] || "?").toUpperCase();
}
function friendly(id: string): string {
  const n = id.includes(":") ? id.split(":").slice(1).join(":") : id;
  return n || id;
}
