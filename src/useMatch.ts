import { useCallback, useEffect, useRef, useState } from "react";
import { wsURL } from "./api.ts";
import type { StateMsg } from "./wire.ts";

export interface MatchConnection {
  state: StateMsg | null;
  connected: boolean;
  errors: string[];
  sendMove: (type: string, payload?: Record<string, unknown>) => void;
}

/**
 * Opens a WebSocket to the gateway for one player of one match and tracks the
 * latest redacted state the server pushes. The server is authoritative — this
 * hook only sends move intents and renders what comes back.
 */
export function useMatch(matchId: string, playerId: string): MatchConnection {
  const [state, setState] = useState<StateMsg | null>(null);
  const [connected, setConnected] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsURL(matchId, playerId));
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.t === "state") {
        setState(msg as StateMsg);
      } else if (msg.t === "move_err") {
        setErrors((e) => [`rejected: ${msg.reason}`, ...e].slice(0, 5));
      } else if (msg.t === "error") {
        setErrors((e) => [`error: ${msg.message}`, ...e].slice(0, 5));
      }
    };
    return () => ws.close();
  }, [matchId, playerId]);

  const sendMove = useCallback(
    (type: string, payload?: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(
        JSON.stringify({
          t: "move",
          matchId,
          clientMoveId: `${playerId}-${Date.now()}`,
          move: { type, payload },
        }),
      );
    },
    [matchId, playerId],
  );

  return { state, connected, errors, sendMove };
}
