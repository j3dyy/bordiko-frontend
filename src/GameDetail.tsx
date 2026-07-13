import { useEffect, useState } from "react";
import { createLobby, fetchCatalog, fetchLeaderboard } from "./api.ts";
import { gameMeta, needsTableSetup, playersLabel } from "./games.ts";
import { RateBar } from "./RateBar.tsx";
import { TableSetup } from "./TableSetup.tsx";
import type { CatalogGame, LeaderRow, Lobby } from "./wire.ts";

// The marketplace game page: hero (art, creator, stats), a Play button, the
// game's leaderboard, and a rating widget. All from data we already serve.
export function GameDetail({
  gameId,
  myId,
  onWaiting,
  onGame,
  onBack,
  onBlocked,
}: {
  gameId: string;
  myId: string;
  onWaiting: (lobby: Lobby) => void;
  onGame: (matchId: string, gameId: string) => void;
  onBack: () => void;
  onBlocked?: () => void;
}) {
  const m = gameMeta(gameId);
  const [game, setGame] = useState<CatalogGame | null>(null);
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [setup, setSetup] = useState(false); // "new table" chooser open

  useEffect(() => {
    let live = true;
    fetchCatalog()
      .then((c) => live && setGame(c.find((g) => g.id === gameId) ?? null))
      .catch(() => {});
    fetchLeaderboard(gameId)
      .then((r) => live && setRows(r))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [gameId]);

  function play() {
    setErr("");
    if (needsTableSetup(m)) setSetup(true);
    else void create(m.minPlayers, "solo");
  }

  async function create(seats: number, mode: "solo" | "teams", khisht = "", format = "") {
    setBusy(true);
    setErr("");
    try {
      const lobby = await createLobby(gameId, seats, mode, "public", "", khisht, format);
      setSetup(false);
      onWaiting(lobby);
    } catch (e) {
      const active = (e as { active?: { matchId: string; gameId: string } }).active;
      if (active) {
        setErr(`You're already in a game of ${gameMeta(active.gameId).name} — resume or leave it from the banner at the top.`);
        onBlocked?.();
      } else {
        setErr(String((e as Error).message ?? e));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="detail">
      <button className="back" onClick={onBack}>← Discover</button>

      <section className="detail-hero" style={{ ["--accent" as string]: m.accent }}>
        <div className="detail-art" aria-hidden>{m.emoji}</div>
        <div className="detail-info">
          <span className="cat-pill">{m.category}</span>
          <h1 className="detail-title">
            {m.name}
            {m.verified && <span className="verified" title="Verified creator">✓</span>}
          </h1>
          <div className="detail-creator">
            by <b>{m.author}</b>
            {m.verified && <span className="verified-tag">verified</span>}
          </div>
          <p className="detail-blurb">{m.blurb}</p>

          <div className="detail-stats">
            <div className="stat-tile">
              <div className="stat-num">{game && game.ratingCount > 0 ? <><span className="star">★</span> {game.rating.toFixed(1)}</> : "—"}</div>
              <div className="stat-lbl">{game && game.ratingCount > 0 ? `${game.ratingCount.toLocaleString()} ratings` : "unrated"}</div>
            </div>
            <div className="stat-tile">
              <div className="stat-num">{playersLabel(m)}</div>
              <div className="stat-lbl">players</div>
            </div>
            <div className="stat-tile">
              <div className="stat-num">{(game?.plays ?? 0).toLocaleString()}</div>
              <div className="stat-lbl">plays</div>
            </div>
            <div className="stat-tile">
              <div className="stat-num">{game?.live ?? 0}</div>
              <div className="stat-lbl">live tables</div>
            </div>
          </div>

          <div className="detail-cta">
            <button disabled={busy} onClick={play}>{busy ? "Creating…" : "▶ Play now"}</button>
          </div>
          {err && <p className="error">{err}</p>}
        </div>
      </section>

      <section className="howto">
        <h3 className="section-title">How to play</h3>
        <p className="howto-goal"><b>Goal —</b> {m.objective}</p>
        <ol className="howto-steps">
          {m.howTo.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="detail-cols">
        <div className="lb-table-wrap">
          <h3 className="section-title">Leaderboard</h3>
          {rows.length === 0 ? (
            <p className="hint">No ranked games yet — be the first to top the ladder.</p>
          ) : (
            <table className="lb-table">
              <thead>
                <tr><th>#</th><th>Player</th><th>Rating</th><th>W</th><th>L</th><th>D</th><th>Win%</th></tr>
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

        <aside className="detail-side">
          <RateBar gameId={gameId} name={m.name} />
        </aside>
      </div>

      {setup && (
        <TableSetup
          gameId={gameId}
          busy={busy}
          err={err}
          onSubmit={(seats, mode, _vis, _pw, khisht, format) => create(seats, mode, khisht, format)}
          onClose={() => setSetup(false)}
        />
      )}
    </div>
  );
}
