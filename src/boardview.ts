// Client mirror of the SDK's BoardView schema (packages/sdk/src/board.ts). A game
// emits this under `state.G.board` from its playerView; SchemaBoard draws it. Kept
// as a local mirror because it crosses the JSON boundary — same pattern as wire.ts
// mirroring the wire protocol.

import { GATEWAY } from "./api.ts";

export interface AssetRef {
  asset: string;
}
export interface MoveRef {
  type: string;
  payload?: unknown;
}

export interface BoardView {
  palette?: { accent?: string; felt?: string };
  banner?: string;
  status?: { phase?: string; note?: string };
  seats?: SeatView[];
  tracks?: TrackView[];
  zones?: ZoneView[];
  prompt?: PromptView;
}

export interface SeatView {
  id: string;
  name?: string;
  role?: string;
  roleArt?: AssetRef;
  color?: string;
  badges?: string[];
  status?: string;
}

export interface TrackView {
  id: string;
  label?: string;
  steps: TrackStep[];
}
export interface TrackStep {
  label?: string;
  state?: "pending" | "current" | "success" | "fail";
}

export interface ZoneView {
  id: string;
  label?: string;
  layout: "fan" | "row" | "stack" | "grid";
  items: ItemView[];
}
export interface ItemView {
  id?: string;
  kind: "card" | "token" | "text";
  face?: { r?: string; s?: string };
  text?: string;
  color?: string;
  art?: AssetRef;
  faceDown?: boolean;
  tag?: string;
}

export type PromptView =
  | { kind: "buttons"; label?: string; options: PromptOption[] }
  | { kind: "vote"; label?: string; yes: MoveRef; no: MoveRef; yesLabel?: string; noLabel?: string }
  | { kind: "pickSeats"; label?: string; count: number; move: MoveRef; from?: string[]; submitLabel?: string };

export interface PromptOption {
  label: string;
  move: MoveRef;
  color?: string;
}

// Where a game publishes its assets (Phase 1c). Until uploads ship, `art` refs
// simply fall back to emoji/initials in the renderer.
export function assetUrl(gameId: string, ref: AssetRef): string {
  return `${GATEWAY}/api/games/${encodeURIComponent(gameId)}/assets/${encodeURIComponent(ref.asset)}`;
}
