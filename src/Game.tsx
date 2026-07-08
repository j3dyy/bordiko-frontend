import { useMatch } from "./useMatch.ts";
import { HexBoard } from "./HexBoard.tsx";
import type { StateMsg } from "./wire.ts";

function resultText(s: StateMsg): string {
  if (s.result?.draw) return "Draw";
  if (s.result?.winner) return `${s.result.winner} wins — ${s.result.reason ?? ""}`;
  return "Game over";
}

export function Game({
  matchId,
  playerId,
  onLeave,
}: {
  matchId: string;
  playerId: string;
  onLeave: () => void;
}) {
  const { state, connected, errors, sendMove } = useMatch(matchId, playerId);

  return (
    <div className="game">
      <div className="statusbar">
        <span className={connected ? "dot on" : "dot off"} title={connected ? "connected" : "offline"} />
        <code className="mid" title="match id">{matchId}</code>
        <span>you: <b>{playerId}</b></span>
        {state && <span>turn {state.turn} · move {state.moveCount}</span>}
        {state && !state.ended && (
          <span className={state.yourTurn ? "turn you" : "turn"}>
            {state.yourTurn ? "● your turn" : `waiting for ${state.currentPlayer}`}
          </span>
        )}
        {state?.ended && <span className="result">{resultText(state)}</span>}
        <button className="ghost" onClick={onLeave}>
          Leave
        </button>
      </div>

      {state ? (
        <HexBoard state={state} playerId={playerId} onMove={sendMove} />
      ) : (
        <p className="hint">Connecting…</p>
      )}

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
