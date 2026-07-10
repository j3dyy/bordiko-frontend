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
  result: { winner?: string; draw?: boolean; reason?: string } | null;
  moveCount: number;
  yourTurn: boolean;
  legalMoves?: MoveDescriptor[];
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

export interface Lobby {
  id: string;
  gameId: string;
  host: string;
  seats: number;
  players: LobbyPlayer[];
  matchId?: string;
  status: "open" | "started";
  createdAt: string;
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
