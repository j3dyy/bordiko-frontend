import { useState } from "react";
import { Lobby } from "./Lobby.tsx";
import { Game } from "./Game.tsx";

export function App() {
  const [session, setSession] = useState<{ matchId: string; playerId: string } | null>(null);

  return (
    <div className="app">
      <header className="topbar">
        <h1>Bordiko</h1>
        <span className="tag">Hive</span>
      </header>
      {session ? (
        <Game
          matchId={session.matchId}
          playerId={session.playerId}
          onLeave={() => setSession(null)}
        />
      ) : (
        <Lobby onJoin={(matchId, playerId) => setSession({ matchId, playerId })} />
      )}
    </div>
  );
}
