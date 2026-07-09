import type { ReactNode } from "react";
import type { MoveDescriptor, StateMsg } from "./wire.ts";

// A game-agnostic renderer. It shows the player's redacted state and turns the
// server's legal moves into buttons. Because the game-host computes legal moves
// for every game, this makes ANY published game playable without a bespoke UI —
// the marketplace promise. Games that deserve a richer board (Hive) get one; the
// rest use this.

export function AutoBoard({
  state,
  onMove,
}: {
  state: StateMsg;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
}) {
  const moves = state.legalMoves ?? [];
  const groups = groupByType(moves);

  return (
    <div className="autoboard">
      <StateView g={state.G} />

      <div className="moves">
        <div className="moves-head">
          {state.ended ? "Game over" : state.yourTurn ? "Your move" : "Waiting for opponent…"}
        </div>
        {state.yourTurn && !state.ended && moves.length === 0 && (
          <p className="hint">No legal moves.</p>
        )}
        {Object.entries(groups).map(([type, ms]) => (
          <div className="move-group" key={type}>
            <span className="move-type">{type}</span>
            <div className="move-buttons">
              {ms.map((m, i) => (
                <button
                  key={i}
                  disabled={!state.yourTurn || state.ended}
                  onClick={() => onMove(m.type, m.payload)}
                  title={JSON.stringify(m.payload ?? {})}
                >
                  {payloadLabel(m) || type}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StateView({ g }: { g: any }) {
  if (g == null || typeof g !== "object") return null;
  const entries = Object.entries(g as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined,
  );
  return (
    <div className="stateview">
      {entries.map(([k, v]) => (
        <div className="statecell" key={k}>
          <div className="statekey">{k}</div>
          <div className="stateval">{renderValue(v)}</div>
        </div>
      ))}
    </div>
  );
}

function renderValue(v: unknown): ReactNode {
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="muted">—</span>;
    return (
      <div className="chips">
        {v.map((item, i) => (
          <span className="chip" key={i}>
            {compact(item)}
          </span>
        ))}
      </div>
    );
  }
  if (v !== null && typeof v === "object") {
    return (
      <div className="chips">
        {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
          <span className="chip" key={k}>
            {k}: {compact(val)}
          </span>
        ))}
      </div>
    );
  }
  return <span>{String(v)}</span>;
}

function compact(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") {
    const vals = Object.values(v as Record<string, unknown>).map((x) =>
      typeof x === "object" ? "…" : String(x),
    );
    return vals.join(" ");
  }
  return String(v);
}

function groupByType(moves: MoveDescriptor[]): Record<string, MoveDescriptor[]> {
  const out: Record<string, MoveDescriptor[]> = {};
  for (const m of moves) {
    (out[m.type] ??= []).push(m);
  }
  return out;
}

function payloadLabel(m: MoveDescriptor): string {
  if (!m.payload || Object.keys(m.payload).length === 0) return "";
  return Object.values(m.payload)
    .map((v) => (typeof v === "object" ? compact(v) : String(v)))
    .join(" · ");
}
