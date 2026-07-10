import { useEffect, useRef, useState } from "react";
import { cancelLobby, getLobby } from "./api.ts";
import { gameMeta } from "./games.ts";
import type { Lobby } from "./wire.ts";

// Shown to the host after creating a table: loads the lobby by id (so it works
// on a refresh/deep-link), polls until an opponent joins and the real match
// starts, then hands off to the live game.
export function Waiting({
  lobbyId,
  onStart,
  onCancel,
}: {
  lobbyId: string;
  onStart: (matchId: string, gameId: string) => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState<Lobby | null>(null);
  const timer = useRef<number | null>(null);
  const onStartRef = useRef(onStart);
  const onCancelRef = useRef(onCancel);
  onStartRef.current = onStart;
  onCancelRef.current = onCancel;

  useEffect(() => {
    const poll = async () => {
      try {
        const l = await getLobby(lobbyId);
        setCurrent(l);
        if (l.status === "started" && l.matchId) {
          onStartRef.current(l.matchId, l.gameId);
        }
      } catch {
        // Lobby vanished (cancelled elsewhere) — bail back home.
        onCancelRef.current();
      }
    };
    timer.current = window.setInterval(poll, 1500);
    void poll();
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [lobbyId]);

  async function cancel() {
    try {
      await cancelLobby(lobbyId);
    } finally {
      onCancelRef.current();
    }
  }

  if (!current) {
    return (
      <div className="waiting">
        <div className="waiting-card">
          <div className="spinner" />
          <p className="waiting-status">Loading table…</p>
        </div>
      </div>
    );
  }

  const m = gameMeta(current.gameId);
  return (
    <div className="waiting">
      <div className="waiting-card">
        <div className="game-emoji big">{m.emoji}</div>
        <h2>{m.name}</h2>
        <p className="waiting-status">
          Waiting for players… <b>{current.players.length}</b>/{current.seats}
        </p>
        <div className="spinner" />
        <div className="waiting-code">
          table code: <code>{current.id}</code>
        </div>
        <p className="hint">Share this page — anyone signed in can join from “Open tables”.</p>
        <button className="ghost" onClick={cancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
