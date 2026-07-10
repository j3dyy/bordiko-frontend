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
  objective: string;
  howTo: string[];
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
    objective: "Be the first to completely surround your opponent's Queen Bee.",
    howTo: [
      "Each turn, either place a new piece from your hand or move one already on the board.",
      "New pieces may only touch your own colour (after the opening moves).",
      "You must place your Queen Bee within your first four turns.",
      "Every bug moves differently: Queen steps 1, Beetle steps 1 and can climb on top, Grasshopper jumps in a straight line over pieces, Spider moves exactly 3, Ant moves anywhere around the hive.",
      "The hive must stay connected — you can't move a piece if doing so splits it.",
      "Surround the enemy Queen on all six sides to win.",
    ],
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
    objective: "Be the first to empty your hand.",
    howTo: [
      "On your turn, play a card matching the rank or suit of the top of the discard pile.",
      "Eights are wild — play one anytime and name the suit the next player must follow.",
      "Can't play? Draw a card from the deck (and play it if it's legal).",
      "Hidden hands: you only ever see your own cards and the public discard.",
      "The first player to shed every card wins the round.",
    ],
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
    objective: "Reach 20 victory points — or be the last monster standing.",
    howTo: [
      "On your turn, roll the six dice up to three times, keeping the faces you like between rolls.",
      "Faces: number sets (three 1/2/3s score points), energy, hearts (heal), and claws (attack).",
      "Take Tokyo to score each turn — but you can't heal there, and everyone targets you.",
      "Claws hit the monster in Tokyo; from Tokyo, claws hit everyone outside.",
      "Take damage in Tokyo and you may yield, letting the attacker move in.",
      "Hit 20 points or knock out every rival to win.",
    ],
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
    objective: "Get three of your marks in a row.",
    howTo: [
      "Players alternate placing their mark (X or O) on the 3×3 grid.",
      "First to line up three in a row — horizontal, vertical, or diagonal — wins.",
      "Fill the board with no line and it's a draw.",
    ],
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
    objective: "Rules are defined by the game's creator.",
    howTo: [
      "This is a community game published to the marketplace.",
      "Create or join a table — the board shows the moves you can legally make each turn, so you can learn as you play.",
    ],
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
