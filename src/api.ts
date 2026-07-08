import type { MatchSummary } from "./wire.ts";

// Gateway base URL (REST proxy + WebSocket live here). Override at build/dev time
// with VITE_GATEWAY_URL.
export const GATEWAY: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_GATEWAY_URL ||
  "http://localhost:8080";

export async function listGames(): Promise<string[]> {
  const res = await fetch(`${GATEWAY}/api/games`);
  if (!res.ok) throw new Error(`listGames: ${res.status}`);
  const data = (await res.json()) as { games: string[] };
  return data.games;
}

export async function createMatch(gameId: string, players: string[]): Promise<MatchSummary> {
  const res = await fetch(`${GATEWAY}/api/matches`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ gameId, players }),
  });
  if (!res.ok) throw new Error(`createMatch: ${res.status} ${await res.text()}`);
  return (await res.json()) as MatchSummary;
}

export function wsURL(matchId: string, playerId: string): string {
  const base = GATEWAY.replace(/^http/, "ws");
  return `${base}/ws?matchId=${encodeURIComponent(matchId)}&playerId=${encodeURIComponent(playerId)}`;
}
