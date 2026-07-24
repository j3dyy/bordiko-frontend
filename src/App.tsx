import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth.tsx";
import { Login } from "./Login.tsx";
import { Home } from "./Home.tsx";
import { Waiting } from "./Waiting.tsx";
import { Game } from "./Game.tsx";
import { GameDetail } from "./GameDetail.tsx";
import { Profile } from "./Profile.tsx";
import { DeveloperProfile } from "./DeveloperProfile.tsx";
import { Leaderboard } from "./Leaderboard.tsx";
import { Admin } from "./Admin.tsx";
import { Developers } from "./Developers.tsx";
import { fetchActive, leaveMatch, type ActiveMatch } from "./api.ts";
import { gameMeta } from "./games.ts";
import { useT, LANGS } from "./i18n.tsx";
import type { Lobby } from "./wire.ts";


type View =
  | { screen: "home" }
  | { screen: "detail"; gameId: string }
  | { screen: "profile" }
  | { screen: "waiting"; lobbyId: string }
  | { screen: "game"; matchId: string; gameId: string }
  | { screen: "leaderboard"; gameId?: string }
  | { screen: "developers"; page?: string }
  | { screen: "developer"; id: string }
  | { screen: "admin" };

// The view is mirrored in the URL path (History API) so links are clean and
// shareable, and a refresh/deep-link restores it — most importantly, staying in
// a live game and reconnecting. Deep links need the nginx SPA fallback
// (try_files … /index.html) shipped in the web image.
function viewToPath(v: View): string {
  switch (v.screen) {
    case "detail": return `/games/${encodeURIComponent(v.gameId)}`;
    case "profile": return "/me";
    case "leaderboard": return v.gameId ? `/leaderboard/${encodeURIComponent(v.gameId)}` : "/leaderboard";
    case "waiting": return `/waiting/${encodeURIComponent(v.lobbyId)}`;
    case "game": return `/play/${encodeURIComponent(v.matchId)}/${encodeURIComponent(v.gameId)}`;
    case "admin": return "/admin";
    case "developers": return v.page ? `/developers/${encodeURIComponent(v.page)}` : "/developers";
    case "developer": return `/u/${encodeURIComponent(v.id)}`;
    default: return "/";
  }
}

function pathToView(pathname: string): View {
  const seg = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (seg[0] === "games" && seg[1]) return { screen: "detail", gameId: seg[1] };
  if (seg[0] === "me") return { screen: "profile" };
  if (seg[0] === "admin") return { screen: "admin" };
  if (seg[0] === "developers") return { screen: "developers", page: seg[1] };
  if (seg[0] === "u" && seg[1]) return { screen: "developer", id: seg[1] };
  if (seg[0] === "leaderboard") return { screen: "leaderboard", gameId: seg[1] };
  if (seg[0] === "waiting" && seg[1]) return { screen: "waiting", lobbyId: seg[1] };
  if (seg[0] === "play" && seg[1] && seg[2]) return { screen: "game", matchId: seg[1], gameId: seg[2] };
  return { screen: "home" };
}

export function App() {
  const { user, loading, logout } = useAuth();
  const { t } = useT();
  const [view, setView] = useState<View>(() => pathToView(window.location.pathname));
  const [active, setActive] = useState<ActiveMatch | null>(null);
  const [leavingActive, setLeavingActive] = useState(false);

  useEffect(() => {
    // Back/forward buttons.
    const onPop = () => setView(pathToView(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Track the user's unfinished match so we can offer to resume (or leave) it —
  // on load, after a reconnect, and whenever they step back out to a menu.
  const refreshActive = useCallback(async () => {
    const a = await fetchActive();
    setActive(a.active && a.matchId ? a : null);
  }, []);
  useEffect(() => {
    if (user && view.screen !== "game") void refreshActive();
  }, [user, view.screen, refreshActive]);

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

  // Developer docs are public — a prospective author can read them (and reach the
  // sandbox instructions) without an account. Rendered before the login gate.
  if (view.screen === "developers") {
    return (
      <Developers
        page={view.page}
        signedIn={!!user}
        onNavigate={(page) => navigate({ screen: "developers", page })}
        onExit={() => navigate({ screen: "home" })}
      />
    );
  }

  if (!user) return <Login />;

  // A disabled account can still read its session but can do nothing — show a
  // clear notice rather than a broken app (the API 403s every action anyway).
  if (user.disabled) {
    return (
      <div className="app center">
        <div className="disabled-notice">
          <img className="brand-mark big" src="/bordiko-icon.svg" alt="" />
          <h1>{t("account.disabledTitle")}</h1>
          <p>{t("account.disabledBody")}</p>
          <button className="ghost small" onClick={logout}>{t("nav.signout")}</button>
        </div>
      </div>
    );
  }

  const inGame = view.screen === "game";

  return (
    <div className={`app${inGame ? " in-game" : ""}`}>
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
              {t("nav.play")}
            </button>
            <button
              className={view.screen === "leaderboard" ? "nav-link active" : "nav-link"}
              onClick={() => navigate({ screen: "leaderboard" })}
            >
              {t("nav.leaderboards")}
            </button>
            <button
              className={view.screen === "profile" ? "nav-link active" : "nav-link"}
              onClick={() => navigate({ screen: "profile" })}
            >
              {t("nav.profile")}
            </button>
            <button className="nav-link" onClick={() => navigate({ screen: "developers" })}>
              {t("nav.developers")}
            </button>
            {user.isAdmin && (
              <button
                className={view.screen === "admin" ? "nav-link active" : "nav-link"}
                onClick={() => navigate({ screen: "admin" })}
              >
                {t("nav.admin")}
              </button>
            )}
          </nav>
        )}
        <div className="user">
          <LangToggle />
          <button className="user-chip" onClick={() => navigate({ screen: "profile" })} title={t("nav.yourProfile")}>
            {user.avatarUrl && <img src={user.avatarUrl} alt="" className="avatar" />}
            <span className="user-name">{user.displayName}</span>
          </button>
          <button className="ghost small" onClick={logout}>
            {t("nav.signout")}
          </button>
        </div>
      </header>

      {active && !(view.screen === "game" && view.matchId === active.matchId) && (
        <ResumeBanner
          active={active}
          leaving={leavingActive}
          onResume={() => navigate({ screen: "game", matchId: active.matchId!, gameId: active.gameId! })}
          onLeave={async () => {
            setLeavingActive(true);
            try {
              await leaveMatch(active.matchId!);
              await refreshActive();
            } catch {
              /* game-host may still be redeploying — leave the banner so they can retry */
            } finally {
              setLeavingActive(false);
            }
          }}
        />
      )}

      {view.screen === "home" && (
        <Home
          onWaiting={(lobby) => navigate({ screen: "waiting", lobbyId: lobby.id })}
          onGame={(matchId, gameId) => navigate({ screen: "game", matchId, gameId })}
          onOpen={(gameId) => navigate({ screen: "detail", gameId })}
          onBlocked={refreshActive}
        />
      )}

      {view.screen === "detail" && (
        <GameDetail
          gameId={view.gameId}
          myId={user.id}
          onWaiting={(lobby) => navigate({ screen: "waiting", lobbyId: lobby.id })}
          onGame={(matchId, gameId) => navigate({ screen: "game", matchId, gameId })}
          onBack={goHome}
          onBlocked={refreshActive}
          onOpenDeveloper={(id) => navigate({ screen: "developer", id })}
        />
      )}

      {view.screen === "profile" && (
        <Profile user={user} onOpenGame={(gameId) => navigate({ screen: "detail", gameId })} onBack={goHome} />
      )}

      {view.screen === "developer" && (
        <DeveloperProfile
          id={view.id}
          onOpenGame={(gameId) => navigate({ screen: "detail", gameId })}
          onBack={goHome}
        />
      )}

      {view.screen === "waiting" && (
        <Waiting
          lobbyId={view.lobbyId}
          myId={user.id}
          onStart={(matchId, gameId) => navigate({ screen: "game", matchId, gameId })}
          onCancel={goHome}
        />
      )}

      {view.screen === "game" && (
        <Game
          key={view.matchId}
          matchId={view.matchId}
          playerId={user.id}
          gameId={view.gameId}
          onLeave={goHome}
          onLeaderboard={() => navigate({ screen: "leaderboard", gameId: view.gameId })}
          onRematch={(matchId, gameId) => navigate({ screen: "game", matchId, gameId })}
        />
      )}

      {view.screen === "leaderboard" && <Leaderboard myId={user.id} initialGameId={view.gameId} />}

      {view.screen === "admin" &&
        (user.isAdmin ? <Admin myId={user.id} /> : <div className="admin"><p className="admin-empty">{t("admin.denied")}</p></div>)}
    </div>
  );
}

// A compact EN / ქარ language switch in the topbar. The choice is persisted and
// applies instantly across the app.
function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="lang-toggle" role="group" aria-label={useT().t("nav.language")}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          className={l.code === lang ? "lang-btn active" : "lang-btn"}
          onClick={() => setLang(l.code)}
          title={l.long}
          aria-pressed={l.code === lang}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// Shown whenever the user has an unfinished match they're not currently viewing:
// one game at a time, so this is how they get back in — or bow out.
function ResumeBanner({
  active,
  leaving,
  onResume,
  onLeave,
}: {
  active: ActiveMatch;
  leaving: boolean;
  onResume: () => void;
  onLeave: () => void;
}) {
  const { t } = useT();
  const m = gameMeta(active.gameId ?? "");
  const [before, after] = t("resume.text").split("{game}");
  return (
    <div className="resume-banner">
      <span className="resume-emoji" aria-hidden>{m.emoji}</span>
      <span className="resume-text">
        {before}<strong>{m.name}</strong>{after}
      </span>
      <button onClick={onResume}>{t("resume.resume")}</button>
      <button className="ghost danger" onClick={onLeave} disabled={leaving}>
        {leaving ? t("resume.leaving") : t("resume.leave")}
      </button>
    </div>
  );
}
