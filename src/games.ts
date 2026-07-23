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
  renderer: "hive" | "eights" | "jokeri" | "auto" | "sandbox";
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
    renderer: "eights",
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
  rails: {
    name: "Rails",
    blurb: "Claim coloured routes across the map, connect your secret cities, build the longest line.",
    minPlayers: 2,
    maxPlayers: 4,
    renderer: "auto", // ships its own sandboxed map UI — auto-detected via the catalog's hasUI flag
    accent: "#7C60F5",
    emoji: "🚂",
    category: "Route Building",
    author: "@bordiko",
    verified: true,
    objective: "Score the most from claimed routes, your longest continuous line, and a connected secret destination.",
    howTo: [
      "On your turn, either draw two train cards or claim one route.",
      "Draw from the face-up row or blindly from the deck (taking a face-up locomotive ★ is your whole turn).",
      "Claim a route by paying that many cards of its colour — locomotives (★) are wild.",
      "Each player holds a secret destination: connect its two cities by game end for a bonus, or lose the points.",
      "When someone drops to two trains the final round begins; then score routes + longest line + destinations.",
    ],
  },
  sumo: {
    name: "Sumo",
    blurb: "Real-time physics duel: thrust with WASD and shove your rival off the ring. Momentum carries — the world never stops.",
    minPlayers: 2,
    maxPlayers: 2,
    renderer: "auto", // ships its own sandboxed real-time canvas UI — auto-detected via the catalog's hasUI flag
    accent: "#17C0A4",
    emoji: "🤼",
    category: "Action / Real-time",
    author: "@bordiko",
    verified: true,
    objective: "Push the other disk's centre past the ring edge. If nobody falls before time, the disk nearer the centre wins.",
    howTo: [
      "Both players move at the same time — there are no turns.",
      "Hold WASD or the arrow keys to thrust; release to coast (momentum and friction do the rest).",
      "Ram your rival to build a shove; catch them off-balance and drive them over the edge.",
      "Stay near the centre — a disk pushed past the ring loses instantly.",
      "Use the ⛶ button for fullscreen.",
    ],
  },
  backgammon: {
    name: "Backgammon",
    blurb: "The classic race game. Roll the dice, hit blots, bear off — and raise the stakes with the doubling cube.",
    minPlayers: 2,
    maxPlayers: 2,
    renderer: "auto", // ships its own sandboxed board UI — auto-detected via the catalog's hasUI flag
    accent: "#7c4a26",
    emoji: "🎲",
    category: "Classic / Dice",
    author: "@bordiko",
    verified: true,
    objective: "Be first to bring all fifteen checkers home and bear them off. Gammons, backgammons, and the doubling cube multiply the score.",
    howTo: [
      "Each player races 15 checkers around to their home board, then bears them off — first to bear off all 15 wins.",
      "Roll two dice and move a checker for each number to an open point (one not held by two or more enemy checkers); doubles play four times.",
      "Land on a lone enemy checker (a blot) to hit it — it goes to the bar and must re-enter before that player moves anything else.",
      "Once all your checkers are home, bear them off by rolling their point's number.",
      "Before rolling you may offer the doubling cube to raise the stakes; your opponent takes (and takes the cube) or drops to concede.",
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
  jokeri: {
    name: "Jokeri",
    blurb: "Bid your tricks and take exactly what you called. Two black-six Jokers rule the deck. Play solo or in partnerships.",
    minPlayers: 4,
    maxPlayers: 4,
    renderer: "jokeri",
    accent: "#D83A34",
    emoji: "🃏",
    category: "Card Game",
    author: "@bordiko",
    verified: true,
    objective: "Score the most points over the match by bidding tricks and taking exactly as many as you declared — with your partner across the table, or for yourself.",
    howTo: [
      "36-card deck (6 to Ace). The two black sixes — 6♠ and 6♣ — are the Jokers, the highest cards in the game.",
      "Each deal sets a trump suit: on the short deals it's the card flipped on the stock (a flipped Joker means no-trump); on the 9-card deals the player after the dealer chooses trump or no-trump.",
      "Going clockwise, every player bids how many tricks they'll take (bid 0 to pass).",
      "Follow the led suit if you can. Trump beats the other suits; a Joker is wild — play it high to win the trick or low to duck, and lead one to 'call' a suit everyone must follow.",
      "Card weights, high to low: Joker, A, K, Q, J, 10, 9, 8, 7, 6.",
      "Make your bid exactly to score big; miss it and you only score 10 per trick; bid but take nothing and you're 'khisht' (a penalty). The match runs four rounds; highest total (team or player) wins.",
    ],
  },
  avalon: {
    name: "Avalon",
    blurb: "Hidden loyalties, secret quests. Merlin knows the evil; the Assassin hunts Merlin. Talk, deduce, and don't get found out.",
    minPlayers: 5,
    maxPlayers: 10,
    renderer: "auto", // rendered by the generic SchemaBoard from the game's BoardView
    accent: "#4429A3",
    emoji: "🛡️",
    category: "Social",
    author: "@bordiko",
    verified: true,
    objective: "As a loyal servant of Arthur, succeed on three quests without revealing Merlin. As a minion of Mordred, sabotage three quests — or find and assassinate Merlin at the end.",
    howTo: [
      "Everyone gets a secret role: good (loyal servants, incl. Merlin) or evil (minions, incl. the Assassin). Merlin secretly sees the evil players; the evil players know each other.",
      "Each round the leader proposes a team for the quest, and everyone votes to approve or reject it. Five rejections in a row hands the round to evil.",
      "On an approved quest, team members secretly play Success or Fail — the good must play Success, evil may sabotage. One Fail usually fails the quest (two on the 4th quest with 7+ players).",
      "Good wins by succeeding on three quests; evil wins by failing three.",
      "If good succeeds three times, the Assassin gets one guess at Merlin — guess right and evil steals the win. So Merlin must guide without being spotted.",
    ],
  },
  "tic-tac-toe": {
    name: "Tic-Tac-Toe",
    blurb: "The classic. Three in a row.",
    minPlayers: 2,
    maxPlayers: 2,
    renderer: "sandbox", // ships its own custom UI bundle (Option 2 demo)
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

// Whether "New table" should open the setup chooser first: true when the game
// offers a choice of player count, or can be played in partnerships (an even
// count of at least four). Single-count free-for-all games skip straight to the
// table.
export function needsTableSetup(m: { minPlayers: number; maxPlayers: number }): boolean {
  return m.maxPlayers > m.minPlayers || (m.maxPlayers >= 4 && m.maxPlayers % 2 === 0);
}

function prettify(id: string): string {
  return id
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// A human label for a player. When a real display name is available it's used
// as-is; an unresolved raw provider id (e.g. "google:1080499…") becomes a short
// "Player 9343" so the UI never shows the ugly id.
export function friendlyName(name: string | undefined | null): string {
  const n = (name ?? "").trim();
  if (!n) return "Player";
  const m = /^(google|github|dev):(.+)$/.exec(n);
  if (m) return "Player " + m[2].slice(-4);
  return n;
}
