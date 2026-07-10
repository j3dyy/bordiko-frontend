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
  category: string;
  author: string;
  verified: boolean;
}

const KNOWN: Record<string, Omit<GameMeta, "id">> = {
  hive: {
    name: "Hive",
    blurb: "Surround the enemy Queen. Bugs on a growing hex mosaic — no board, no dice.",
    minPlayers: 2,
    maxPlayers: 2,
    renderer: "hive",
    accent: "#6C4CF1",
    emoji: "🐝",
    category: "Hex & Area",
    author: "@bordiko",
    verified: true,
  },
  eights: {
    name: "Crazy Eights",
    blurb: "Shed your hand by matching rank or suit. Eights are wild. Hidden hands.",
    minPlayers: 2,
    maxPlayers: 5,
    renderer: "auto",
    accent: "#17C0A4",
    emoji: "🃏",
    category: "Card Game",
    author: "@bordiko",
    verified: true,
  },
  "king-of-tokyo": {
    name: "King of Tokyo",
    blurb: "Roll dice, grab Tokyo, smash your rivals. Push your luck across three rolls.",
    minPlayers: 2,
    maxPlayers: 4,
    renderer: "auto",
    accent: "#FF6A3D",
    emoji: "🎲",
    category: "Dice",
    author: "@bordiko",
    verified: true,
  },
  "tic-tac-toe": {
    name: "Tic-Tac-Toe",
    blurb: "The classic. Three in a row.",
    minPlayers: 2,
    maxPlayers: 2,
    renderer: "auto",
    accent: "#FFC53D",
    emoji: "⭕",
    category: "Abstract",
    author: "@bordiko",
    verified: true,
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
    accent: "#7C60F5",
    emoji: "🎮",
    category: "Community",
    author: "@community",
    verified: false,
  };
}

// Players label like "2" or "2–4".
export function playersLabel(m: { minPlayers: number; maxPlayers: number }): string {
  return m.minPlayers === m.maxPlayers ? `${m.minPlayers}` : `${m.minPlayers}–${m.maxPlayers}`;
}

function prettify(id: string): string {
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
