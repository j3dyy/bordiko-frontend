import { useEffect, useRef } from "react";
import { GATEWAY } from "./api.ts";
import type { StateMsg, ChatMsg } from "./wire.ts";

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
  onRequestFullscreen,
  onLog,
  chat,
  onSendChat,
}: {
  state: StateMsg;
  playerId: string;
  gameId: string;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
  /** The bundle asked (via `bordiko:fullscreen`) for the host to toggle fullscreen. */
  onRequestFullscreen?: () => void;
  /** A log/error the sandboxed UI forwarded (for the developer debug panel). */
  onLog?: (entry: { level: string; message: string }) => void;
  /** Table chat to relay into the game (for games that render their own chat). */
  chat?: ChatMsg[];
  /** The game sent a chat message (via `bordiko:chat`) — forward it to the table. */
  onSendChat?: (text: string) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const sentChat = useRef(0);
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

  // Relay new table chat into the game (for games that render their own chat).
  useEffect(() => {
    const frame = ref.current?.contentWindow;
    if (!frame || !chat) return;
    for (let i = sentChat.current; i < chat.length; i++) {
      const c = chat[i];
      frame.postMessage({ t: "bordiko:chat", msg: { from: c.from, name: c.name ?? "", text: c.text, ts: (c as { ts?: number }).ts ?? 0 } }, "*");
    }
    sentChat.current = chat.length;
  }, [chat]);

  // Accept ONLY move/chat/emote intents, ONLY from our own iframe.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const m = e.data as { t?: string; type?: string; payload?: Record<string, unknown> };
      if (!m || typeof m !== "object") return;
      if (m.t === "bordiko:ready") push();
      else if (m.t === "bordiko:move" && typeof m.type === "string") onMove(m.type, m.payload);
      else if (m.t === "bordiko:fullscreen") onRequestFullscreen?.();
      else if (m.t === "bordiko:log") {
        const l = m as unknown as { level?: string; message?: string };
        onLog?.({ level: String(l.level || "log"), message: String(l.message ?? "") });
      } else if (m.t === "bordiko:chat") {
        const c = m as unknown as { text?: string };
        if (typeof c.text === "string") onSendChat?.(c.text);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, onMove, onRequestFullscreen, onLog, onSendChat]);

  return (
    <iframe
      ref={ref}
      className="sandbox-frame"
      src={`${GATEWAY}/api/games/${encodeURIComponent(gameId)}/ui`}
      sandbox="allow-scripts"
      allow="fullscreen"
      title="game board"
      onLoad={push}
    />
  );
}
