// Client mirror of the gateway wire protocol (see packages/shared/protocol.ts,
// the canonical spec). Hive-specific state shape is included for the renderer.

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
  type: "place" | "move" | "pass";
  payload?: Record<string, unknown>;
}

export interface StateMsg {
  t: "state";
  matchId: string;
  G: HiveG;
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
