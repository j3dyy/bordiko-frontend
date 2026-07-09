import { useCallback, useEffect, useRef, useState } from "react";
import { createLobby, joinLobby, listGames, listLobbies } from "./api.ts";
import { gameMeta } from "./games.ts";
import type { Lobby } from "./wire.ts";

export function Home({
  onWaiting,
  onGame,
}: {
  onWaiting: (lobby: Lobby) => void;
  onGame: (matchId: string, gameId: string) => void;
}) {
  const [games, setGames] = useState<string[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState("");
  const timer = useRef<number | null>(null);

  const refreshLobbies = useCallback(async () => {
    try {
      setLobbies(await listLobbies());
    } catch {
      /* transient — keep the last list */
    }
  }, []);

  useEffect(() => {
    listGames().then(setGames).catch((e) => setErr(String(e.message ?? e)));
    void refreshLobbies();
    timer.current = window.setInterval(refreshLobbies, 3000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [refreshLobbies]);

  async function create(gameId: string) {
    setBusy(gameId);
    setErr("");
    try {
      const meta = gameMeta(gameId);
      const lobby = await createLobby(gameId, meta.minPlayers);
      onWaiting(lobby);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy("");
    }
  }

  async function join(lobby: Lobby) {
    setBusy(lobby.id);
    setErr("");
    try {
      const joined = await joinLobby(lobby.id);
      if (joined.status === "started" && joined.matchId) {
        onGame(joined.matchId, joined.gameId);
      } else {
        onWaiting(joined);
      }
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="home">
      <section>
        <h2 className="section-title">Games</h2>
        {games.length === 0 ? (
          <p className="hint">
            No games available from the game-host yet. Build the wasm (<code>npm run wasm:build</code>)
            or publish one to the marketplace.
          </p>
        ) : (
          <div className="catalog">
            {games.map((id) => {
              const m = gameMeta(id);
              return (
                <div className="game-card" key={id} style={{ ["--accent" as string]: m.accent }}>
                  <div className="game-emoji">{m.emoji}</div>
                  <div className="game-body">
                    <h3>{m.name}</h3>
                    <p>{m.blurb}</p>
                    <div className="game-meta">
                      {m.minPlayers === m.maxPlayers
                        ? `${m.minPlayers} players`
                        : `${m.minPlayers}–${m.maxPlayers} players`}
                    </div>
                  </div>
                  <button disabled={busy === id} onClick={() => create(id)}>
                    {busy === id ? "Creating…" : "New table"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">Open tables</h2>
        {lobbies.length === 0 ? (
          <p className="hint">No one is waiting right now. Start a new table above.</p>
        ) : (
          <ul className="tables">
            {lobbies.map((l) => {
              const m = gameMeta(l.gameId);
              return (
                <li className="table-row" key={l.id}>
                  <span className="table-emoji">{m.emoji}</span>
                  <span className="table-game">{m.name}</span>
                  <span className="table-host">
                    hosted by <b>{l.players[0]?.name ?? "?"}</b>
                  </span>
                  <span className="table-seats">
                    {l.players.length}/{l.seats}
                  </span>
                  <button disabled={busy === l.id} onClick={() => join(l)}>
                    {busy === l.id ? "Joining…" : "Join"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {err && <p className="error">{err}</p>}
    </div>
  );
}
