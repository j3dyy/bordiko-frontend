import type { Lobby, LeaderRow, Providers, User, CatalogGame, AdminGame, AdminUser, ModerationGame, DeveloperProfile } from "./wire.ts";

// Gateway base URL (auth + REST proxy + WebSocket all live here). Override at
// build/dev time with VITE_GATEWAY_URL.
export const GATEWAY: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_GATEWAY_URL ||
  "http://localhost:8080";

// Every request carries the session cookie (login is required to play).
async function req(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${GATEWAY}${path}`, { credentials: "include", ...init });
}

async function json<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) throw new Error(`${label}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

/* --------------------------------- auth ----------------------------------- */

export async function fetchMe(): Promise<User | null> {
  const res = await req("/auth/me");
  if (res.status === 401) return null;
  return json<User>(res, "me");
}

export async function fetchProviders(): Promise<Providers> {
  return json<Providers>(await req("/auth/providers"), "providers");
}

// Top-level navigation to the provider (or dev) login. Not fetch — the browser
// follows redirects to the OAuth consent screen and back.
export function loginURL(provider: string, name?: string): string {
  const q = name ? `?name=${encodeURIComponent(name)}` : "";
  return `${GATEWAY}/auth/${provider}/login${q}`;
}

// Set a custom display name (shown on the board, leaderboards, etc.). Returns
// the saved name; the caller should refresh the auth context afterwards.
export async function setUsername(name: string): Promise<{ id: string; displayName: string; avatarUrl?: string }> {
  return json(
    await req("/auth/username", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    }),
    "setUsername",
  );
}

export async function logout(): Promise<void> {
  await req("/auth/logout", { method: "POST" });
}

/* -------------------------------- catalog --------------------------------- */

export async function listGames(): Promise<string[]> {
  const data = await json<{ games: string[] }>(await req("/api/games"), "listGames");
  return data.games ?? [];
}

// The rich Discover catalog: per-game metadata + real rating/plays/live counts.
// Which published games ship a custom sandboxed UI bundle. Cached from the
// catalog so the game view can auto-pick the sandbox renderer for ANY marketplace
// game (no per-game curation), even on a deep link where Discover wasn't loaded.
let hasUICache: Record<string, boolean> | null = null;
let hasUIPromise: Promise<Record<string, boolean>> | null = null;
export async function loadHasUI(): Promise<Record<string, boolean>> {
  if (hasUICache) return hasUICache;
  if (!hasUIPromise) {
    hasUIPromise = fetchCatalog()
      .then((games) => (hasUICache = Object.fromEntries(games.map((g) => [g.id, !!g.hasUI]))))
      .catch(() => ({})); // best-effort: on failure, nothing is treated as custom-UI
  }
  return hasUIPromise;
}

export async function fetchCatalog(): Promise<CatalogGame[]> {
  const data = await json<{ games: CatalogGame[] }>(await req("/api/catalog"), "catalog");
  return data.games ?? [];
}

// Submit the signed-in user's star rating (1–5) for a game; returns the new
// aggregate. The gateway derives the user id from the session cookie.
export async function rateGame(gameId: string, stars: number): Promise<{ rating: number; ratingCount: number }> {
  return json<{ rating: number; ratingCount: number }>(
    await req(`/api/games/${encodeURIComponent(gameId)}/rate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stars }),
    }),
    "rate",
  );
}

// The signed-in user's own stars for a game (0 if unrated), to pre-fill the rater.
export async function fetchMyRating(gameId: string): Promise<number> {
  const res = await req(`/api/games/${encodeURIComponent(gameId)}/my-rating`);
  if (!res.ok) return 0; // graceful on an older gateway
  const data = (await res.json().catch(() => ({}))) as { stars?: number };
  return data.stars ?? 0;
}

/* --------------------------------- lobby ---------------------------------- */

export async function listLobbies(): Promise<Lobby[]> {
  const data = await json<{ lobbies: Lobby[] }>(await req("/api/lobby"), "listLobbies");
  return data.lobbies ?? [];
}

// Thrown by create/join when the user is already in an unfinished match, so the
// caller can route them back into it ("resume") instead of erroring.
export interface ActiveMatchError extends Error {
  active: { matchId: string; gameId: string };
}

async function lobbyResult(res: Response, label: string): Promise<Lobby> {
  if (res.status === 409) {
    const body = await res.json().catch(() => ({}) as Record<string, string>);
    if (body.error === "active_match") {
      throw Object.assign(new Error("active_match"), {
        active: { matchId: body.matchId, gameId: body.gameId },
      });
    }
  }
  return json<Lobby>(res, label);
}

export async function createLobby(
  gameId: string,
  seats = 2,
  mode: "solo" | "teams" = "solo",
  visibility: "public" | "private" = "public",
  password = "",
  khisht = "",
  format = "",
): Promise<Lobby> {
  return lobbyResult(
    await req("/api/lobby", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gameId, seats, mode, visibility, password, khisht, format }),
    }),
    "createLobby",
  );
}

export async function getLobby(id: string): Promise<Lobby> {
  return json<Lobby>(await req(`/api/lobby/${encodeURIComponent(id)}`), "getLobby");
}

export async function joinLobby(id: string, password = ""): Promise<Lobby> {
  return lobbyResult(
    await req(`/api/lobby/${encodeURIComponent(id)}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    }),
    "joinLobby",
  );
}

// Take a specific seat (choosing your partnership in teams mode); moves you if
// you were already seated elsewhere.
export async function sitSeat(id: string, seat: number, password = ""): Promise<Lobby> {
  return lobbyResult(
    await req(`/api/lobby/${encodeURIComponent(id)}/sit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seat, password }),
    }),
    "sitSeat",
  );
}

// Leave your seat but stay at the table.
export async function standSeat(id: string): Promise<Lobby> {
  return json<Lobby>(
    await req(`/api/lobby/${encodeURIComponent(id)}/stand`, { method: "POST" }),
    "standSeat",
  );
}

// Host-only: fill an empty seat with a computer player.
export async function addBot(id: string, seat: number): Promise<Lobby> {
  return json<Lobby>(
    await req(`/api/lobby/${encodeURIComponent(id)}/addbot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seat }),
    }),
    "addBot",
  );
}

// Host-only: remove a bot from its seat.
export async function removeBot(id: string, seat: number): Promise<Lobby> {
  return json<Lobby>(
    await req(`/api/lobby/${encodeURIComponent(id)}/removebot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seat }),
    }),
    "removeBot",
  );
}

// Host-only: begin the match once every seat is filled.
export async function startLobby(id: string): Promise<Lobby> {
  return json<Lobby>(
    await req(`/api/lobby/${encodeURIComponent(id)}/start`, { method: "POST" }),
    "startLobby",
  );
}

export async function cancelLobby(id: string): Promise<void> {
  await req(`/api/lobby/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/* -------------------------------- match ----------------------------------- */

// The signed-in user's active (unfinished) match, if any — used to offer
// "resume your game" on load and after a reconnect.
export interface ActiveMatch {
  active: boolean;
  matchId?: string;
  gameId?: string;
}
export async function fetchActive(): Promise<ActiveMatch> {
  try {
    return await json<ActiveMatch>(await req("/api/active"), "active");
  } catch {
    return { active: false };
  }
}

// Leave an in-progress match: the caller's team forfeits so the others aren't
// stuck and everyone is freed to start a new game. Throws if the server didn't
// actually end the match, so the UI never pretends a failed leave succeeded.
export async function leaveMatch(matchId: string): Promise<void> {
  const res = await req(`/api/matches/${encodeURIComponent(matchId)}/leave`, { method: "POST" });
  if (!res.ok) {
    let msg = `couldn't leave (${res.status})`;
    try {
      const b = await res.json();
      if (b?.error) msg = b.message ? `${b.error}: ${b.message}` : b.error;
    } catch {
      /* non-JSON body */
    }
    throw new Error(msg);
  }
}

/* ----------------------------- leaderboard -------------------------------- */

export async function fetchLeaderboard(gameId: string): Promise<LeaderRow[]> {
  const data = await json<{ entries: LeaderRow[] }>(
    await req(`/api/leaderboard?gameId=${encodeURIComponent(gameId)}`),
    "leaderboard",
  );
  return data.entries ?? [];
}

/* -------------------------------- admin ----------------------------------- */

export async function adminListGames(): Promise<AdminGame[]> {
  const data = await json<{ games: AdminGame[] }>(await req("/api/admin/games"), "adminGames");
  return data.games ?? [];
}

export async function adminSetGameEnabled(id: string, enabled: boolean): Promise<void> {
  const res = await req(`/api/admin/games/${encodeURIComponent(id)}/enabled`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(`setGameEnabled: ${res.status} ${await res.text()}`);
}

// A developer enables/disables one of THEIR OWN games (ownership checked server-side).
export async function setMyGameEnabled(gameId: string, enabled: boolean): Promise<void> {
  const res = await req(`/api/my/games/${encodeURIComponent(gameId)}/enabled`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(`setMyGameEnabled: ${res.status} ${await res.text()}`);
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const data = await json<{ users: AdminUser[] }>(await req("/api/admin/users"), "adminUsers");
  return data.users ?? [];
}

export async function adminSetUserDisabled(id: string, disabled: boolean): Promise<void> {
  const res = await req(`/api/admin/users/${encodeURIComponent(id)}/disabled`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ disabled }),
  });
  if (!res.ok) throw new Error(`setUserDisabled: ${res.status} ${await res.text()}`);
}

/* --------------------- publishing / moderation ---------------------------- */

// The publish package a developer submits. `source` (base64) is required by the
// gateway; `wasm` is base64; `ui` is raw HTML.
export interface PublishPackage {
  manifest: Record<string, unknown>;
  wasm: string;
  source: string;
  ui?: string;
  assets?: Record<string, string>;
}

// Self-service publish (any signed-in developer). Returns the created version row
// (status "pending") or throws with the gateway/registry validation message.
export async function publishGame(pkg: PublishPackage): Promise<ModerationGame> {
  const res = await req("/api/games/publish", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(pkg),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(b.message || b.error || `publish failed (${res.status})`);
  }
  return (await res.json()) as ModerationGame;
}

// The signed-in developer's own submissions + status.
export async function fetchMyGames(): Promise<ModerationGame[]> {
  return json<ModerationGame[]>(await req("/api/my/games"), "myGames");
}

// A developer's PUBLIC author profile (name + their published games).
export async function fetchDeveloper(id: string): Promise<DeveloperProfile> {
  return json<DeveloperProfile>(await req(`/api/developers/${encodeURIComponent(id)}`), "developer");
}

/* -------- admin moderation -------- */

export async function fetchModeration(): Promise<ModerationGame[]> {
  return json<ModerationGame[]>(await req("/api/admin/moderation"), "moderation");
}

export async function moderateGame(
  gameId: string,
  version: string,
  action: "approve" | "reject",
  reason = "",
): Promise<void> {
  const res = await req(
    `/api/admin/games/${encodeURIComponent(gameId)}/versions/${encodeURIComponent(version)}/moderate`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, reason }) },
  );
  if (!res.ok) throw new Error(`moderate: ${res.status} ${await res.text()}`);
}

// The submitted source bundle for a version (plain text) — the admin's code review.
export async function fetchGameSource(gameId: string, version: string): Promise<string> {
  const res = await req(
    `/api/admin/games/${encodeURIComponent(gameId)}/versions/${encodeURIComponent(version)}/source`,
  );
  if (!res.ok) throw new Error(`source: ${res.status}`);
  return res.text();
}

export async function deleteGame(gameId: string): Promise<void> {
  const res = await req(`/api/admin/games/${encodeURIComponent(gameId)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`delete: ${res.status} ${await res.text()}`);
}

/* ------------------------------ websocket --------------------------------- */

// The gateway authenticates the socket from the session cookie; playerId is
// passed only as a hint (the server ignores it and uses the cookie identity).
export function wsURL(matchId: string): string {
  const base = GATEWAY.replace(/^http/, "ws");
  return `${base}/ws?matchId=${encodeURIComponent(matchId)}`;
}
