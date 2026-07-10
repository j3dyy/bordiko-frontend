import { useState } from "react";
import { useMatch } from "./useMatch.ts";
import { HexBoard } from "./HexBoard.tsx";
import { AutoBoard } from "./AutoBoard.tsx";
import { rateGame } from "./api.ts";
import { gameMeta } from "./games.ts";
import type { StateMsg } from "./wire.ts";

function resultText(s: StateMsg, myId: string): string {
  if (s.result?.draw) return "Draw";
  if (s.result?.winner) {
    const who = s.result.winner === myId ? "You win" : "You lose";
    return `${who}${s.result.reason ? ` — ${s.result.reason}` : ""}`;
  }
  return "Game over";
}

export function Game({
  matchId,
  playerId,
  gameId,
  onLeave,
}: {
  matchId: string;
  playerId: string;
  gameId: string;
  onLeave: () => void;
}) {
  const { state, connected, errors, sendMove } = useMatch(matchId, playerId);
  const meta = gameMeta(gameId);

  return (
    <div className="game">
      <div className="statusbar">
        <span className={connected ? "dot on" : "dot off"} title={connected ? "connected" : "offline"} />
        <span className="game-tag">
          {meta.emoji} {meta.name}
        </span>
        <code className="mid" title="match id">{matchId}</code>
        {state && <span>turn {state.turn} · move {state.moveCount}</span>}
        {state && !state.ended && (
          <span className={state.yourTurn ? "turn you" : "turn"}>
            {state.yourTurn ? "● your turn" : "waiting…"}
          </span>
        )}
        {state?.ended && <span className="result">{resultText(state, playerId)}</span>}
        <button className="ghost" onClick={onLeave}>
          Leave
        </button>
      </div>

      {state ? (
        meta.renderer === "hive" ? (
          <HexBoard state={state} playerId={playerId} onMove={sendMove} />
        ) : (
          <AutoBoard state={state} onMove={sendMove} />
        )
      ) : (
        <p className="hint">Connecting…</p>
      )}

      <RateBar gameId={gameId} name={meta.name} />

      {errors.length > 0 && (
        <ul className="errlist">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A 5-star rater for the game being played. One rating per user (server upserts);
// posting again just updates it.
function RateBar({ gameId, name }: { gameId: string; name: string }) {
  const [mine, setMine] = useState(0);
  const [hover, setHover] = useState(0);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  async function rate(stars: number) {
    setMine(stars);
    setErr("");
    try {
      await rateGame(gameId, stars);
      setSaved(true);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    }
  }

  const shown = hover || mine;
  return (
    <div className="ratebar">
      <span className="ratebar-label">{saved ? `Thanks — you rated ${name}` : `Enjoying ${name}? Rate it`}</span>
      <div className="ratebar-stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`ratestar${n <= shown ? " on" : ""}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => rate(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
          >
            ★
          </button>
        ))}
      </div>
      {err && <span className="ratebar-err">{err}</span>}
    </div>
  );
}
