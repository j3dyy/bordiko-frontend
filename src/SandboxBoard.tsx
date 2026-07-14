import { useEffect, useRef } from "react";
import type { StateMsg } from "./wire.ts";

// Option 2: a game's OWN front-end, loaded in a locked-down iframe.
//
// The bundle is served from the gateway at /api/games/{id}/ui and rendered in an
// iframe with `sandbox="allow-scripts"` and NO `allow-same-origin` — so it runs
// at an opaque origin: it cannot read this app's DOM, cookies, or session, and
// (via the CSP the gateway sets on the bundle) it has no network access. It can
// ONLY exchange postMessage with us. We relay the redacted match state in, and
// relay the moves it proposes back out through the normal gateway — where the
// game-host validates every one against the WASM reducer. So an untrusted UI can
// never cheat, desync, or exfiltrate; worst case is a bad-looking board.
export function SandboxBoard({
  state,
  playerId,
  gameId,
  onMove,
}: {
  state: StateMsg;
  playerId: string;
  gameId: string;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const lang = (() => {
    try {
      return localStorage.getItem("bordiko:lang") ?? "en";
    } catch {
      return "en";
    }
  })();

  // The redacted view we hand the bundle — exactly what this player may see,
  // plus their own id and the current language. No secrets beyond playerView.
  const payload = () => ({
    t: "bordiko:state",
    state: {
      G: state.G,
      legalMoves: state.yourTurn ? state.legalMoves ?? [] : [],
      yourTurn: !!state.yourTurn,
      names: state.names ?? {},
      playOrder: state.playOrder ?? [],
      currentPlayer: state.currentPlayer,
      ended: !!state.ended,
      result: state.result ?? null,
      moveCount: state.moveCount,
      playerId,
      lang,
    },
  });

  const push = () => ref.current?.contentWindow?.postMessage(payload(), "*");

  // Re-send the state to the bundle whenever it changes.
  useEffect(() => {
    push();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Accept ONLY move/chat/emote intents, ONLY from our own iframe.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const m = e.data as { t?: string; type?: string; payload?: Record<string, unknown> };
      if (!m || typeof m !== "object") return;
      if (m.t === "bordiko:ready") push();
      else if (m.t === "bordiko:move" && typeof m.type === "string") onMove(m.type, m.payload);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onMove]);

  return (
    <iframe
      ref={ref}
      className="sandbox-frame"
      src={`/api/games/${encodeURIComponent(gameId)}/ui`}
      sandbox="allow-scripts"
      title="game board"
      onLoad={push}
    />
  );
}
