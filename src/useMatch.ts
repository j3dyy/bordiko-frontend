import { useCallback, useEffect, useRef, useState } from "react";
import { wsURL } from "./api.ts";
import type { ChatMsg, EmoteMsg, EventsMsg, GameEvent, StateMsg } from "./wire.ts";

export type LiveEmote = EmoteMsg & { id: number };

// One batch of reducer-emitted events, tagged with a monotonic sequence so the
// sandbox relay can forward each batch exactly once (events fire-and-forget, so
// we keep only the latest batch rather than an ever-growing log).
export interface EventBatch {
  seq: number;
  events: GameEvent[];
}

export interface MatchConnection {
  state: StateMsg | null;
  connected: boolean;
  errors: string[];
  chat: ChatMsg[];
  emotes: LiveEmote[];
  events: EventBatch | null;
  sendMove: (type: string, payload?: Record<string, unknown>) => void;
  sendChat: (text: string) => void;
  sendEmote: (emote: string) => void;
}

/**
 * Opens a WebSocket to the gateway for one player of one match and tracks the
 * latest redacted state the server pushes. The server is authoritative — this
 * hook only sends move/chat intents and renders what comes back.
 */
export function useMatch(matchId: string, playerId: string): MatchConnection {
  const [state, setState] = useState<StateMsg | null>(null);
  const [connected, setConnected] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [emotes, setEmotes] = useState<LiveEmote[]>([]);
  const [events, setEvents] = useState<EventBatch | null>(null);
  const emoteId = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(wsURL(matchId));
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.t === "state") {
        setState(msg as StateMsg);
      } else if (msg.t === "chat") {
        setChat((c) => [...c, msg as ChatMsg].slice(-200));
      } else if (msg.t === "emote") {
        const id = ++emoteId.current;
        setEmotes((e) => [...e, { ...(msg as EmoteMsg), id }].slice(-10));
        // auto-clear once the pop/float animation is done
        setTimeout(() => setEmotes((e) => e.filter((x) => x.id !== id)), 4500);
      } else if (msg.t === "events") {
        const list = (msg as EventsMsg).events;
        if (Array.isArray(list) && list.length) setEvents((b) => ({ seq: (b?.seq ?? 0) + 1, events: list }));
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

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      const ws = wsRef.current;
      if (!trimmed || !ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ t: "chat", matchId, text: trimmed, ts: Date.now() }));
    },
    [matchId],
  );

  const sendEmote = useCallback(
    (emote: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ t: "emote", matchId, emote, ts: Date.now() }));
    },
    [matchId],
  );

  return { state, connected, errors, chat, emotes, events, sendMove, sendChat, sendEmote };
}
