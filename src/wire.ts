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

// A UI/animation event the reducer emitted via ctx.emit(type, data) on a move or
// tick. Non-authoritative — relayed to the game's sandboxed UI for effects/sound.
export interface GameEvent {
  type: string;
  data?: unknown;
  turn: number;
}

// The gateway batches the events from one applied move/tick into a single frame.
export interface EventsMsg {
  t: "events";
  matchId: string;
  moveCount: number;
  events: GameEvent[];
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

// Rematch coordination (see the gateway hub). A player opts in with {t:"rematch"};
// the server echoes an offer to the room, and once everyone has opted in it sends
// a ready frame pointing both clients at the freshly created match.
export interface RematchOfferMsg {
  t: "rematch_offer";
  matchId: string;
  from: string; // player id who wants a rematch
  name: string;
}
export interface RematchReadyMsg {
  t: "rematch_ready";
  matchId: string; // the NEW match id
  gameId: string;
}

/* ------------------------------- accounts --------------------------------- */

export interface User {
  id: string;
  displayName: string;
  avatarUrl: string;
  isAdmin?: boolean;
  disabled?: boolean;
}

/* -------------------------------- admin ----------------------------------- */

export interface AdminGame {
  id: string;
  displayName: string;
  minPlayers: number;
  maxPlayers: number;
  enabled: boolean;
}

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  provider: string;
  disabled: boolean;
  admin: boolean;
  createdAt: string;
}

export interface Providers {
  providers: string[]; // e.g. ["google","github"]
  dev: boolean;
}

/* -------------------------------- lobby ----------------------------------- */

export interface LobbyPlayer {
  id: string;
  name: string;
  bot?: boolean; // a computer player the host added to fill a seat
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

// A configurable table option a game declares in its manifest. The New-table
// chooser renders these as controls; the chosen value reaches the game's setup as
// config[id] (so `id` = the config key the reducer reads, e.g. "bestOf").
export interface GameOption {
  id: string;
  label: string;
  type: "choice" | "toggle";
  choices?: { value: string | number; label: string; sub?: string }[];
  default: string | number | boolean;
}

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
  hasUI?: boolean; // ships a custom sandboxed UI bundle → the frontend auto-renders it
  ownerId?: string; // publishing developer ("" / absent = first-party) → links to their author page
  ownerName?: string; // that developer's display name, shown as the author (e.g. "jedy")
  options?: GameOption[]; // game-declared table options the lobby renders as controls
}

/* ----------------------- publishing / moderation -------------------------- */

// One submitted game version, as the moderation queue (admin) and "my games"
// (developer) list it. status: pending | published | rejected.
export interface ModerationGame {
  gameId: string;
  version: string;
  displayName: string;
  status: "pending" | "published" | "rejected";
  rejectReason?: string;
  sourceBytes?: number;
  hasUI?: boolean;
  ownerId?: string;
  board?: string;
  minPlayers?: number;
  maxPlayers?: number;
  createdAt?: string;
  enabled?: boolean; // published games only: whether the developer/admin has it live
}

// A developer's public author profile: their name + the games they've published.
export interface DevGame {
  id: string;
  displayName: string;
  board: string;
  minPlayers: number;
  maxPlayers: number;
  hasUI?: boolean;
}
export interface DeveloperProfile {
  id: string;
  displayName: string;
  games: DevGame[];
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
