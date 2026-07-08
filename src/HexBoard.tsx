import { useEffect, useMemo, useState } from "react";
import { hexToPixel, hexPolygon, hexKey, parseHexKey } from "./hexgeom.ts";
import type { StateMsg } from "./wire.ts";

const SIZE = 30;
const PLAYER_COLORS = ["#d3a24a", "#5b6ea6"]; // player 0, player 1
const KIND_NAMES: Record<string, string> = {
  Q: "Queen", B: "Beetle", G: "Grasshopper", S: "Spider", A: "Ant",
};

type Selection = { mode: "place"; kind: string } | { mode: "move"; from: string } | null;

export function HexBoard({
  state,
  playerId,
  onMove,
}: {
  state: StateMsg;
  playerId: string;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
}) {
  const [sel, setSel] = useState<Selection>(null);

  // Reset selection whenever the authoritative state advances.
  useEffect(() => {
    setSel(null);
  }, [state.moveCount, state.currentPlayer]);

  const myIndex = state.playOrder.indexOf(playerId);
  const legal = state.yourTurn ? state.legalMoves ?? [] : [];

  const { placementsByKind, movesByFrom, placeableKinds } = useMemo(() => {
    const placementsByKind = new Map<string, Set<string>>();
    const movesByFrom = new Map<string, string[]>();
    for (const m of legal) {
      const p = (m.payload ?? {}) as Record<string, number & string>;
      if (m.type === "place") {
        const set = placementsByKind.get(p.kind as unknown as string) ?? new Set<string>();
        set.add(hexKey({ q: p.q as number, r: p.r as number }));
        placementsByKind.set(p.kind as unknown as string, set);
      } else if (m.type === "move") {
        const from = hexKey({ q: p.fromQ as number, r: p.fromR as number });
        const arr = movesByFrom.get(from) ?? [];
        arr.push(hexKey({ q: p.toQ as number, r: p.toR as number }));
        movesByFrom.set(from, arr);
      }
    }
    return { placementsByKind, movesByFrom, placeableKinds: [...placementsByKind.keys()] };
  }, [legal]);

  const targets = useMemo(() => {
    const s = new Set<string>();
    if (sel?.mode === "place") for (const k of placementsByKind.get(sel.kind) ?? []) s.add(k);
    else if (sel?.mode === "move") for (const k of movesByFrom.get(sel.from) ?? []) s.add(k);
    return s;
  }, [sel, placementsByKind, movesByFrom]);

  // Render occupied cells plus every possible legal target, so layout is stable.
  const cells = useMemo(() => {
    const set = new Set<string>(Object.keys(state.G.board).filter((k) => state.G.board[k]?.length));
    for (const kSet of placementsByKind.values()) for (const k of kSet) set.add(k);
    for (const arr of movesByFrom.values()) for (const k of arr) set.add(k);
    if (set.size === 0) set.add("0,0");
    return [...set];
  }, [state.G.board, placementsByKind, movesByFrom]);

  const positioned = cells.map((k) => {
    const p = hexToPixel(parseHexKey(k), SIZE);
    return { k, x: p.x, y: p.y };
  });
  const xs = positioned.map((p) => p.x);
  const ys = positioned.map((p) => p.y);
  const pad = SIZE * 1.6;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
  const h = Math.max(...ys) - Math.min(...ys) + pad * 2;

  function clickCell(k: string) {
    if (!state.yourTurn) return;
    if (targets.has(k)) {
      const { q, r } = parseHexKey(k);
      if (sel?.mode === "place") {
        onMove("place", { kind: sel.kind, q, r });
      } else if (sel?.mode === "move") {
        const f = parseHexKey(sel.from);
        onMove("move", { fromQ: f.q, fromR: f.r, toQ: q, toR: r });
      }
      setSel(null);
      return;
    }
    const stack = state.G.board[k];
    if (stack?.length) {
      const top = stack[stack.length - 1];
      if (top.player === myIndex && movesByFrom.has(k)) {
        setSel({ mode: "move", from: k });
        return;
      }
    }
    setSel(null);
  }

  const myHand = myIndex >= 0 ? state.G.hands[myIndex] : {};
  const passOnly = legal.length === 1 && legal[0].type === "pass";

  return (
    <div className="board-wrap">
      <svg className="board" viewBox={`${minX} ${minY} ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        {positioned.map(({ k, x, y }) => {
          const stack = state.G.board[k];
          const top = stack?.length ? stack[stack.length - 1] : null;
          const isTarget = targets.has(k);
          const movable = !!top && top.player === myIndex && movesByFrom.has(k) && state.yourTurn;
          const selectedFrom = sel?.mode === "move" && sel.from === k;
          return (
            <g key={k} onClick={() => clickCell(k)} style={{ cursor: isTarget || movable ? "pointer" : "default" }}>
              <polygon
                points={hexPolygon(x, y, SIZE - 2)}
                fill={top ? PLAYER_COLORS[top.player] : "#1b1e28"}
                stroke={isTarget ? "#4ade80" : selectedFrom ? "#fde047" : movable ? "#8aa0d8" : "#3a3f4b"}
                strokeWidth={isTarget || selectedFrom ? 3 : movable ? 2 : 1}
                strokeDasharray={isTarget && !top ? "5,4" : undefined}
                opacity={top ? 1 : isTarget ? 0.95 : 0.45}
              />
              {top && (
                <text x={x} y={y} className="glyph" textAnchor="middle" dominantBaseline="central">
                  {top.kind}
                  {stack.length > 1 ? `·${stack.length}` : ""}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="hand">
        {passOnly ? (
          <button className="pass" onClick={() => onMove("pass")} disabled={!state.yourTurn}>
            Pass (no legal moves)
          </button>
        ) : (
          <>
            <span className="handlabel">Hand:</span>
            {["Q", "S", "B", "G", "A"].map((kind) => {
              const count = (myHand as Record<string, number>)[kind] ?? 0;
              const placeable = placeableKinds.includes(kind) && state.yourTurn;
              const active = sel?.mode === "place" && sel.kind === kind;
              return (
                <button
                  key={kind}
                  className={`piece ${active ? "active" : ""}`}
                  disabled={count === 0 || !placeable}
                  title={KIND_NAMES[kind]}
                  onClick={() => setSel({ mode: "place", kind })}
                >
                  {kind}
                  <sub>{count}</sub>
                </button>
              );
            })}
          </>
        )}
      </div>

      <p className="hint">
        {!state.yourTurn
          ? "Waiting for your opponent…"
          : sel?.mode === "place"
            ? `Placing ${KIND_NAMES[sel.kind] ?? sel.kind} — click a highlighted cell.`
            : sel?.mode === "move"
              ? "Click a highlighted destination."
              : "Pick a piece from your hand to place, or click one of your pieces to move it."}
      </p>
    </div>
  );
}
