import { useEffect, useRef, useState } from "react";
import { cancelLobby, getLobby } from "./api.ts";
import { gameMeta } from "./games.ts";
import type { Lobby } from "./wire.ts";

// Shown to the host after creating a table: polls the lobby until an opponent
// joins and the real match starts, then hands off to the live game.
export function Waiting({
  lobby,
  onStart,
  onCancel,
}: {
  lobby: Lobby;
  onStart: (matchId: string, gameId: string) => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState<Lobby>(lobby);
  const timer = useRef<number | null>(null);
  const m = gameMeta(lobby.gameId);

  useEffect(() => {
    const poll = async () => {
      try {
        const l = await getLobby(lobby.id);
        setCurrent(l);
        if (l.status === "started" && l.matchId) {
          onStart(l.matchId, l.gameId);
        }
      } catch {
        // Lobby vanished (cancelled elsewhere) — bail back home.
        onCancel();
      }
    };
    timer.current = window.setInterval(poll, 1500);
    void poll();
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [lobby.id, onStart, onCancel]);

  async function cancel() {
    try {
      await cancelLobby(lobby.id);
    } finally {
      onCancel();
    }
  }

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
          table code: <code>{lobby.id}</code>
        </div>
        <p className="hint">Share this page — anyone signed in can join from “Open tables”.</p>
        <button className="ghost" onClick={cancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
