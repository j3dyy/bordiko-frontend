// Presentation metadata for the catalog. The gateway/game-host only knows game
// *ids*; this maps the ones we ship to a friendly name, player range, and which
// renderer to use. Unknown ids (e.g. a game published later to the marketplace)
// fall back to sensible defaults and the generic legal-move renderer, so every
// published game is still browsable and playable.

export interface GameMeta {
  id: string;
  name: string;
  blurb: string;
  minPlayers: number;
  maxPlayers: number;
  renderer: "hive" | "auto";
  accent: string;
  emoji: string;
}

const KNOWN: Record<string, Omit<GameMeta, "id">> = {
  hive: {
    name: "Hive",
    blurb: "Surround the enemy Queen. Bugs on a growing hex mosaic — no board, no dice.",
    minPlayers: 2,
    maxPlayers: 2,
    renderer: "hive",
    accent: "#e0b23c",
    emoji: "🐝",
  },
  eights: {
    name: "Crazy Eights",
    blurb: "Shed your hand by matching rank or suit. Eights are wild. Hidden hands.",
    minPlayers: 2,
    maxPlayers: 5,
    renderer: "auto",
    accent: "#4ea1ff",
    emoji: "🃏",
  },
  "king-of-tokyo": {
    name: "King of Tokyo",
    blurb: "Roll dice, grab Tokyo, smash your rivals. Push your luck across three rolls.",
    minPlayers: 2,
    maxPlayers: 4,
    renderer: "auto",
    accent: "#ff6b6b",
    emoji: "🎲",
  },
  "tic-tac-toe": {
    name: "Tic-Tac-Toe",
    blurb: "The classic. Three in a row.",
    minPlayers: 2,
    maxPlayers: 2,
    renderer: "auto",
    accent: "#9aa0ad",
    emoji: "⭕",
  },
};

export function gameMeta(id: string): GameMeta {
  const known = KNOWN[id];
  if (known) return { id, ...known };
  // A game we've never seen (freshly published to the marketplace).
  return {
    id,
    name: prettify(id),
    blurb: "A community game published to the Bordiko marketplace.",
    minPlayers: 2,
    maxPlayers: 4,
    renderer: "auto",
    accent: "#4ade80",
    emoji: "🎮",
  };
}

function prettify(id: string): string {
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
