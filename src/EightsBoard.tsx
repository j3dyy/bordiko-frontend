import { useEffect, useMemo, useState } from "react";
import { Card, SuitGlyph } from "./CardArt.tsx";
import type { StateMsg } from "./wire.ts";

interface CardT {
  r: string;
  s: string;
}
interface EightsView {
  discardTop: CardT;
  activeSuit: string;
  deckCount: number;
  handCounts: Record<string, number>;
  hand: CardT[];
}

// small deterministic tilt so pile cards look hand-dropped (not machine-aligned)
function tilt(c: CardT): number {
  return (((c.r.charCodeAt(0) + c.s.charCodeAt(0)) % 7) - 3) * 2;
}

// A real card-table renderer for Crazy Eights: opponents' face-down fans up top,
// a draw deck + discard pile in the middle, your hand fanned at the bottom.
// Played cards drop onto the pile; wild 8s open a suit picker.
export function EightsBoard({
  state,
  playerId,
  onMove,
}: {
  state: StateMsg;
  playerId: string;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
}) {
  const G = state.G as EightsView;
  const top = G.discardTop;
  const [picker, setPicker] = useState<CardT | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  // Clear transient UI when the authoritative state advances.
  useEffect(() => {
    setPicker(null);
    setPlaying(null);
  }, [state.moveCount, state.currentPlayer]);

  const legal = state.yourTurn ? state.legalMoves ?? [] : [];
  const playable = useMemo(() => {
    const set = new Set<string>();
    for (const m of legal) {
      if (m.type === "play") {
        const c = (m.payload as { card?: CardT } | undefined)?.card;
        if (c) set.add(c.r + c.s);
      }
    }
    return set;
  }, [legal]);
  const canDraw = legal.some((m) => m.type === "draw");
  const opponents = Object.entries(G.handCounts).filter(([id]) => id !== playerId);
  const suitChanged = G.activeSuit !== top.s;

  function playCard(c: CardT) {
    if (!state.yourTurn || !playable.has(c.r + c.s)) return;
    if (c.r === "8") {
      setPicker(c);
      return;
    }
    setPlaying(c.r + c.s);
    onMove("play", { card: c });
  }
  function pickSuit(s: string) {
    if (!picker) return;
    setPlaying(picker.r + picker.s);
    onMove("play", { card: picker, suit: s });
    setPicker(null);
  }

  const hint = !state.yourTurn
    ? "Waiting for your opponent…"
    : picker
      ? "Pick a suit for your 8."
      : playable.size === 0
        ? "No playable card — draw from the deck."
        : "Play a card matching the suit or rank, or an 8 (wild).";

  return (
    <div className="eights">
      <div className="eb-opponents">
        {opponents.length === 0 ? (
          <span className="eb-opp-count">Waiting for opponents…</span>
        ) : (
          opponents.map(([id, count]) => (
            <div className="eb-opp" key={id}>
              <div className="eb-opp-fan">
                {Array.from({ length: Math.max(1, Math.min(count, 5)) }).map((_, i) => (
                  <div className="eb-opp-card" style={{ ["--i" as string]: i }} key={i}>
                    <Card back size={46} />
                  </div>
                ))}
              </div>
              <span className="eb-opp-count">{count} card{count === 1 ? "" : "s"}</span>
            </div>
          ))
        )}
      </div>

      <div className="eb-table">
        <button className={`eb-deck ${canDraw ? "can" : ""}`} onClick={() => canDraw && onMove("draw")} disabled={!canDraw} title="Draw a card">
          <div className="eb-deck-stack">
            <Card back size={102} />
          </div>
          <span className="eb-deck-count">{G.deckCount}</span>
          {canDraw && <span className="eb-deck-hint">Draw</span>}
        </button>

        <div className="eb-pile">
          <div className="eb-discard-top" key={state.moveCount} style={{ ["--rot" as string]: `${tilt(top)}deg` }}>
            <Card r={top.r} s={top.s} size={116} />
          </div>
        </div>

        <div className={`eb-suit ${suitChanged ? "changed" : ""}`} title={suitChanged ? "An 8 changed the suit in play" : "Suit in play"}>
          <span className="eb-suit-label">in play</span>
          <SuitGlyph s={G.activeSuit} size={26} />
        </div>
      </div>

      <div className="eb-hand">
        {G.hand.map((c, i) => {
          const key = c.r + c.s;
          const isPlayable = state.yourTurn && playable.has(key);
          const n = G.hand.length;
          const rot = (i - (n - 1) / 2) * Math.min(6, 54 / Math.max(n, 1));
          return (
            <div
              className={`eb-slot ${isPlayable ? "playable" : ""} ${state.yourTurn && !isPlayable ? "dim" : ""}`}
              key={key + i}
              style={{ ["--rot" as string]: `${rot}deg`, zIndex: i, marginLeft: i ? -42 : 0 }}
              onClick={() => playCard(c)}
            >
              <div className={`eb-lift ${playing === key ? "playing" : ""}`}>
                <Card r={c.r} s={c.s} size={102} />
              </div>
            </div>
          );
        })}
      </div>

      {picker && (
        <div className="eb-picker-backdrop" onClick={() => setPicker(null)}>
          <div className="eb-picker" onClick={(e) => e.stopPropagation()}>
            <div className="eb-picker-title">Wild 8 — choose the suit</div>
            <div className="eb-picker-suits">
              {["C", "D", "H", "S"].map((s) => (
                <button key={s} className="eb-picker-suit" onClick={() => pickSuit(s)} aria-label={`suit ${s}`}>
                  <SuitGlyph s={s} size={38} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <p className="hint eb-hint">{hint}</p>
    </div>
  );
}
