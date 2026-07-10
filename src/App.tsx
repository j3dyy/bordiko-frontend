import { useState } from "react";
import { useAuth } from "./auth.tsx";
import { Login } from "./Login.tsx";
import { Home } from "./Home.tsx";
import { Waiting } from "./Waiting.tsx";
import { Game } from "./Game.tsx";
import { GameDetail } from "./GameDetail.tsx";
import { Profile } from "./Profile.tsx";
import { Leaderboard } from "./Leaderboard.tsx";
import type { Lobby } from "./wire.ts";


type View =
  | { screen: "home" }
  | { screen: "detail"; gameId: string }
  | { screen: "profile" }
  | { screen: "waiting"; lobby: Lobby }
  | { screen: "game"; matchId: string; gameId: string }
  | { screen: "leaderboard" };

export function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<View>({ screen: "home" });

  if (loading) {
    return (
      <div className="app center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Login />;

  const goHome = () => setView({ screen: "home" });
  const inGame = view.screen === "game";

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={goHome}>
          <img className="brand-mark" src="/bordiko-icon.svg" alt="" /> Bordiko
        </button>
        {!inGame && (
          <nav className="nav">
            <button
              className={view.screen === "home" || view.screen === "waiting" || view.screen === "detail" ? "nav-link active" : "nav-link"}
              onClick={goHome}
            >
              Play
            </button>
            <button
              className={view.screen === "leaderboard" ? "nav-link active" : "nav-link"}
              onClick={() => setView({ screen: "leaderboard" })}
            >
              Leaderboards
            </button>
            <button
              className={view.screen === "profile" ? "nav-link active" : "nav-link"}
              onClick={() => setView({ screen: "profile" })}
            >
              Profile
            </button>
          </nav>
        )}
        <div className="user">
          <button className="user-chip" onClick={() => setView({ screen: "profile" })} title="Your profile">
            {user.avatarUrl && <img src={user.avatarUrl} alt="" className="avatar" />}
            <span className="user-name">{user.displayName}</span>
          </button>
          <button className="ghost small" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      {view.screen === "home" && (
        <Home
          onWaiting={(lobby) => setView({ screen: "waiting", lobby })}
          onGame={(matchId, gameId) => setView({ screen: "game", matchId, gameId })}
          onOpen={(gameId) => setView({ screen: "detail", gameId })}
        />
      )}

      {view.screen === "detail" && (
        <GameDetail
          gameId={view.gameId}
          myId={user.id}
          onWaiting={(lobby) => setView({ screen: "waiting", lobby })}
          onGame={(matchId, gameId) => setView({ screen: "game", matchId, gameId })}
          onBack={goHome}
        />
      )}

      {view.screen === "profile" && (
        <Profile user={user} onOpenGame={(gameId) => setView({ screen: "detail", gameId })} onBack={goHome} />
      )}

      {view.screen === "waiting" && (
        <Waiting
          lobby={view.lobby}
          onStart={(matchId, gameId) => setView({ screen: "game", matchId, gameId })}
          onCancel={goHome}
        />
      )}

      {view.screen === "game" && (
        <Game matchId={view.matchId} playerId={user.id} gameId={view.gameId} onLeave={goHome} />
      )}

      {view.screen === "leaderboard" && <Leaderboard myId={user.id} />}
    </div>
  );
}
