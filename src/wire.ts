// Client mirror of the gateway wire protocol (see packages/shared/protocol.ts,
// the canonical spec). Game-specific state shapes (Hive) are included for the
// dedicated renderer; other games use the generic legal-move renderer.

export interface HivePiece {
  player: 0 | 1;
  kind: string;
}

export interface HiveG {
  board: Record<string, HivePiece[]>;
  hands: [Record<string, number>, Record<string, number>];
  queenPlaced: [boolean, boolean];
  placed: [number, number];
}

export interface MoveDescriptor {
  type: string;
  payload?: Record<string, unknown>;
}

export interface StateMsg {
  t: "state";
  matchId: string;
  // G is the player's redacted game state. Typed loosely so any game renders;
  // the Hive renderer narrows it to HiveG.
  G: any;
  turn: number;
  currentPlayer: string;
  playOrder: string[];
  ended: boolean;
  result: { winner?: string; winners?: string[]; losers?: string[]; draw?: boolean; reason?: string } | null;
  moveCount: number;
  yourTurn: boolean;
  legalMoves?: MoveDescriptor[];
  // Unix-ms deadline for the current turn; the gateway auto-plays a safe move if
  // the acting player doesn't move in time. Absent when there's no timer.
  turnDeadline?: number;
  // player id → display name, so the board can label seats by name (not raw id).
  names?: Record<string, string>;
}

export interface MatchSummary {
  id: string;
  gameId: string;
  players: string[];
  currentPlayer: string;
}

// A live in-game chat line (relayed by the gateway to everyone in the match).
export interface ChatMsg {
  t: "chat";
  matchId: string;
  from: string; // sender user id
  name: string; // sender display name
  text: string;
  ts: number;
}

// A quick reaction (emoji "poke") relayed to everyone in the match.
export interface EmoteMsg {
  t: "emote";
  matchId: string;
  from: string;
  name: string;
  emote: string; // key from the allowed set (see games/emotes)
  ts: number;
}

/* ------------------------------- accounts --------------------------------- */

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string;
}

export interface Providers {
  providers: string[]; // e.g. ["google","github"]
  dev: boolean;
}

/* -------------------------------- lobby ----------------------------------- */

export interface LobbyPlayer {
  id: string;
  name: string;
}

// One place at the table. `team` is the partnership id: in "teams" mode partners
// sit across from each other (seat-index parity), in "solo" mode each seat is
// its own team. `player` is null/absent when the seat is empty.
export interface Seat {
  index: number;
  team: number;
  player?: LobbyPlayer | null;
}

export interface Lobby {
  id: string;
  gameId: string;
  host: string;
  mode: "solo" | "teams";
  visibility: "public" | "private";
  hasPassword: boolean;
  khisht?: string; // jokeri only: "spec" | a flat number
  format?: string; // jokeri only: "nines" (direct-nines); absent ⇒ standard
  seats: Seat[];
  matchId?: string;
  status: "open" | "started";
  createdAt: string;
}

// Seated player count and whether the table is full — the seats array is the
// source of truth now. Null-safe so a stale/mismatched lobby payload degrades
// gracefully instead of crashing the whole app.
export function seatedCount(l: Lobby): number {
  return (l.seats ?? []).filter((s) => s.player).length;
}
export function lobbyFull(l: Lobby): boolean {
  const seats = l.seats ?? [];
  return seats.length > 0 && seats.every((s) => s.player);
}

/* -------------------------------- catalog --------------------------------- */

// One marketplace game with real, server-computed stats (see the gateway's
// /api/catalog). Presentation (name, blurb, emoji, category, creator) is merged
// in on the client from games.ts.
export interface CatalogGame {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
  board: string;
  rating: number;
  ratingCount: number;
  plays: number;
  live: number;
}

/* ----------------------------- leaderboard -------------------------------- */

export interface LeaderRow {
  userId: string;
  displayName: string;
  avatarUrl: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  games: number;
  winRate: number;
}
