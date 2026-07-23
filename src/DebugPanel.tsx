import { useEffect, useRef, useState } from "react";
import type { StateMsg } from "./wire.ts";

// A developer debug panel, shown when a game is opened with ?debug (or toggled
// with Ctrl+Shift+D). It surfaces two things a game author otherwise can't see:
//   1. Console — errors/warnings the game's SANDBOXED UI forwarded (its own
//      console is invisible outside the opaque-origin iframe).
//   2. State — the live redacted state, legal moves, and turn info the reducer
//      produced, so "why is the board doing that?" is inspectable at a glance.
export interface DebugLog {
  level: string;
  message: string;
  ts: number;
}

export function DebugPanel({
  state,
  logs,
  onClear,
  onClose,
}: {
  state: StateMsg | null;
  logs: DebugLog[];
  onClear: () => void;
  onClose: () => void;
}) {
  const [showState, setShowState] = useState(true);
  const [showConsole, setShowConsole] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the console to the newest line.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);

  const gJson = (() => {
    try {
      return JSON.stringify(state?.G, null, 2);
    } catch {
      return String(state?.G);
    }
  })();
  const gShown = gJson && gJson.length > 8000 ? gJson.slice(0, 8000) + "\n… (truncated)" : gJson;
  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <div className="dbg" role="complementary" aria-label="Developer debug panel">
      <div className="dbg-head">
        <span className="dbg-title">🐛 Debug</span>
        {errorCount > 0 && <span className="dbg-errbadge">{errorCount}</span>}
        <span className="dbg-spacer" />
        <button className="dbg-btn" onClick={onClear} title="Clear the console">Clear</button>
        <button className="dbg-btn" onClick={onClose} title="Close (Ctrl+Shift+D)" aria-label="Close debug panel">×</button>
      </div>

      <div className="dbg-body">
        <div className="dbg-section">
          <button className="dbg-sec-head" onClick={() => setShowState((s) => !s)}>
            <span>{showState ? "▾" : "▸"} State</span>
            {state && (
              <span className="dbg-summary">
                move {state.moveCount} · {state.yourTurn ? "your turn" : "waiting"}
                {state.G?.phase ? ` · ${state.G.phase}` : ""}
              </span>
            )}
          </button>
          {showState && state && (
            <div className="dbg-state">
              <div className="dbg-kv">
                <b>currentPlayer</b> {String(state.currentPlayer ?? "—")} · <b>turn</b> {state.turn} · <b>ended</b>{" "}
                {String(state.ended)}
              </div>
              {state.legalMoves && (
                <div className="dbg-kv">
                  <b>legalMoves</b> {state.legalMoves.length}
                  {state.legalMoves.length > 0 && (
                    <> · {[...new Set(state.legalMoves.map((m) => m.type))].join(", ")}</>
                  )}
                </div>
              )}
              <pre className="dbg-json">{gShown}</pre>
            </div>
          )}
        </div>

        <div className="dbg-section">
          <button className="dbg-sec-head" onClick={() => setShowConsole((s) => !s)}>
            <span>{showConsole ? "▾" : "▸"} Console ({logs.length})</span>
          </button>
          {showConsole && (
            <div className="dbg-console" ref={logRef}>
              {logs.length === 0 ? (
                <div className="dbg-empty">
                  Nothing yet. Uncaught errors, <code>console.error</code>/<code>console.warn</code>, and{" "}
                  <code>host.debug()</code> from this game's UI appear here.
                </div>
              ) : (
                logs.map((l, i) => (
                  <div key={i} className={`dbg-log ${l.level}`}>
                    <span className="dbg-lvl">{l.level}</span>
                    <span className="dbg-msg">{l.message}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
