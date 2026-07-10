import { useEffect, useState } from "react";
import { fetchLeaderboard, listGames } from "./api.ts";
import { gameMeta } from "./games.ts";
import type { LeaderRow } from "./wire.ts";

export function Leaderboard({ myId, initialGameId }: { myId: string; initialGameId?: string }) {
  const [games, setGames] = useState<string[]>([]);
  const [gameId, setGameId] = useState<string>(initialGameId ?? "");
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listGames().then((gs) => {
      setGames(gs);
      // Prefer the game we were opened for (e.g. from a game-over screen), else
      // include it even if the catalog list is momentarily behind.
      setGameId((cur) => cur || (initialGameId && gs.includes(initialGameId) ? initialGameId : gs[0]) || "");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    fetchLeaderboard(gameId)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [gameId]);

  return (
    <div className="leaderboard">
      <div className="lb-head">
        <h2 className="section-title">Leaderboard</h2>
        <select value={gameId} onChange={(e) => setGameId(e.target.value)}>
          {games.map((g) => (
            <option key={g} value={g}>
              {gameMeta(g).emoji} {gameMeta(g).name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="hint">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="hint">No ranked games played yet. Be the first to top the ladder.</p>
      ) : (
        <table className="lb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Rating</th>
              <th>W</th>
              <th>L</th>
              <th>D</th>
              <th>Win%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className={r.userId === myId ? "me" : ""}>
                <td className="rank">{i + 1}</td>
                <td className="player">
                  {r.avatarUrl && <img src={r.avatarUrl} alt="" className="lb-avatar" />}
                  {r.displayName}
                </td>
                <td className="rating">{r.rating}</td>
                <td>{r.wins}</td>
                <td>{r.losses}</td>
                <td>{r.draws}</td>
                <td>{r.games > 0 ? `${Math.round(r.winRate * 100)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
