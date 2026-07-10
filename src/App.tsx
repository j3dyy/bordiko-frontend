import { useCallback, useEffect, useState } from "react";
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
  | { screen: "waiting"; lobbyId: string }
  | { screen: "game"; matchId: string; gameId: string }
  | { screen: "leaderboard" };

// The view is mirrored in the URL path (History API) so links are clean and
// shareable, and a refresh/deep-link restores it — most importantly, staying in
// a live game and reconnecting. Deep links need the nginx SPA fallback
// (try_files … /index.html) shipped in the web image.
function viewToPath(v: View): string {
  switch (v.screen) {
    case "detail": return `/games/${encodeURIComponent(v.gameId)}`;
    case "profile": return "/me";
    case "leaderboard": return "/leaderboard";
    case "waiting": return `/waiting/${encodeURIComponent(v.lobbyId)}`;
    case "game": return `/play/${encodeURIComponent(v.matchId)}/${encodeURIComponent(v.gameId)}`;
    default: return "/";
  }
}

function pathToView(pathname: string): View {
  const seg = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (seg[0] === "games" && seg[1]) return { screen: "detail", gameId: seg[1] };
  if (seg[0] === "me") return { screen: "profile" };
  if (seg[0] === "leaderboard") return { screen: "leaderboard" };
  if (seg[0] === "waiting" && seg[1]) return { screen: "waiting", lobbyId: seg[1] };
  if (seg[0] === "play" && seg[1] && seg[2]) return { screen: "game", matchId: seg[1], gameId: seg[2] };
  return { screen: "home" };
}

export function App() {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname));

  useEffect(() => {
    // Back/forward buttons.
    const onPop = () => setView(pathToView(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((v: View) => {
    const path = viewToPath(v);
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
    setView(v);
  }, []);

  const goHome = useCallback(() => navigate({ screen: "home" }), [navigate]);

  if (loading) {
    return (
      <div className="app center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Login />;

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
              onClick={() => navigate({ screen: "leaderboard" })}
            >
              Leaderboards
            </button>
            <button
              className={view.screen === "profile" ? "nav-link active" : "nav-link"}
              onClick={() => navigate({ screen: "profile" })}
            >
              Profile
            </button>
          </nav>
        )}
        <div className="user">
          <button className="user-chip" onClick={() => navigate({ screen: "profile" })} title="Your profile">
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
          onWaiting={(lobby) => navigate({ screen: "waiting", lobbyId: lobby.id })}
          onGame={(matchId, gameId) => navigate({ screen: "game", matchId, gameId })}
          onOpen={(gameId) => navigate({ screen: "detail", gameId })}
        />
      )}

      {view.screen === "detail" && (
        <GameDetail
          gameId={view.gameId}
          myId={user.id}
          onWaiting={(lobby) => navigate({ screen: "waiting", lobbyId: lobby.id })}
          onGame={(matchId, gameId) => navigate({ screen: "game", matchId, gameId })}
          onBack={goHome}
        />
      )}

      {view.screen === "profile" && (
        <Profile user={user} onOpenGame={(gameId) => navigate({ screen: "detail", gameId })} onBack={goHome} />
      )}

      {view.screen === "waiting" && (
        <Waiting
          lobbyId={view.lobbyId}
          onStart={(matchId, gameId) => navigate({ screen: "game", matchId, gameId })}
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
