import { useEffect, type ReactNode } from "react";

// The in-app developer docs. A public section (no login) that teaches a
// third-party author how to build, test, and publish a game. Content is
// English on purpose — developer docs. The narrow, factual source of truth is
// the engine/SDK in packages/* and docs/*.md; keep code samples copy-paste
// correct against the shipped reference games (games/tic-tac-toe is the model).

interface DocPage {
  id: string;
  title: string;
}

const PAGES: DocPage[] = [
  { id: "overview", title: "Overview" },
  { id: "quickstart", title: "Quickstart" },
  { id: "game-api", title: "Game API" },
  { id: "rendering", title: "Rendering your game" },
  { id: "publishing", title: "Publishing" },
  { id: "sandbox", title: "Testing & the sandbox" },
];

export function Developers({
  page,
  signedIn,
  onNavigate,
  onExit,
}: {
  page?: string;
  signedIn: boolean;
  onNavigate: (page: string) => void;
  onExit: () => void;
}) {
  const current = PAGES.find((p) => p.id === page) ?? PAGES[0];

  // Land at the top when switching pages (deep links + sidebar clicks).
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [current.id]);

  const idx = PAGES.findIndex((p) => p.id === current.id);
  const prev = PAGES[idx - 1];
  const next = PAGES[idx + 1];

  return (
    <div className="docs">
      <header className="docs-top">
        <button className="brand" onClick={onExit}>
          <img className="brand-mark" src="/bordiko-icon.svg" alt="" /> Bordiko
          <span className="docs-badge">Developers</span>
        </button>
        <div className="docs-top-actions">
          <button className="ghost small" onClick={onExit}>
            {signedIn ? "Back to Bordiko" : "Play games"}
          </button>
        </div>
      </header>

      <div className="docs-shell">
        <nav className="docs-nav" aria-label="Documentation">
          {PAGES.map((p) => (
            <button
              key={p.id}
              className={p.id === current.id ? "docs-nav-link active" : "docs-nav-link"}
              onClick={() => onNavigate(p.id)}
            >
              {p.title}
            </button>
          ))}
        </nav>

        <main className="docs-content">
          <Content id={current.id} onNavigate={onNavigate} />

          <div className="docs-pager">
            {prev ? (
              <button className="docs-pager-btn" onClick={() => onNavigate(prev.id)}>
                <span className="docs-pager-dir">← Previous</span>
                <span className="docs-pager-title">{prev.title}</span>
              </button>
            ) : <span />}
            {next && (
              <button className="docs-pager-btn right" onClick={() => onNavigate(next.id)}>
                <span className="docs-pager-dir">Next →</span>
                <span className="docs-pager-title">{next.title}</span>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ------------------------------- helpers -------------------------------- */

function Code({ children }: { children: string }) {
  return (
    <pre className="doc-pre">
      <code>{children}</code>
    </pre>
  );
}

function Callout({ kind = "note", children }: { kind?: "note" | "tip" | "warn"; children: ReactNode }) {
  const label = kind === "tip" ? "Tip" : kind === "warn" ? "Heads up" : "Note";
  return (
    <div className={`doc-callout ${kind}`}>
      <span className="doc-callout-tag">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Card({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <button className="doc-card" onClick={onClick}>
      <span className="doc-card-title">{title}</span>
      <span className="doc-card-desc">{desc}</span>
    </button>
  );
}

/* -------------------------------- content ------------------------------- */

function Content({ id, onNavigate }: { id: string; onNavigate: (page: string) => void }) {
  switch (id) {
    case "quickstart": return <Quickstart />;
    case "game-api": return <GameApi />;
    case "rendering": return <Rendering />;
    case "publishing": return <Publishing />;
    case "sandbox": return <Sandbox />;
    default: return <Overview onNavigate={onNavigate} />;
  }
}

function Overview({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <article className="doc">
      <h1>Build a game for Bordiko</h1>
      <p className="doc-lede">
        Bordiko is an open board-game marketplace. You write a game in TypeScript, it compiles to
        WebAssembly and runs sandboxed on our servers, and players around the world play it online —
        in real time, ranked, with chat, bots, and reconnection handled for you.
      </p>

      <h2>The one rule: a game is a deterministic reducer</h2>
      <p>
        Everything on the platform rests on a single invariant:
      </p>
      <Code>{`same seed + same ordered moves  ⇒  byte-identical game state`}</Code>
      <p>
        You never read the clock or call <code>Math.random()</code>. Every source of randomness comes
        from a context object we pass in. Because your game is a pure function of its inputs, we get
        server authority (the server re-runs every move and rejects illegal ones), instant replays,
        reconnection, and bots — all for free, from the same code.
      </p>

      <h2>What you actually write</h2>
      <ul className="doc-list">
        <li><b>setup</b> — build the initial state from the player list (deals, shuffles, boards).</li>
        <li><b>moves</b> — one function per action; validate, then mutate the state.</li>
        <li><b>playerView</b> <span className="doc-opt">(optional)</span> — hide secret information (hands, roles) per player.</li>
        <li><b>endIf</b> <span className="doc-opt">(optional)</span> — decide when someone has won.</li>
        <li><b>enumerate</b> <span className="doc-opt">(optional)</span> — list the legal moves; this powers bots and a zero-effort default UI.</li>
      </ul>

      <h2>Three ways to show it</h2>
      <p>You choose how much UI to write — from none at all to a fully bespoke board:</p>
      <ul className="doc-list">
        <li><b>Nothing</b> — implement <code>enumerate</code> and players get typed buttons for every legal move. Great for prototyping.</li>
        <li><b>A declarative board</b> — return a <code>board</code> schema (seats, zones, tracks, a prompt) and the platform renders it. No UI code.</li>
        <li><b>Your own UI</b> — ship a self-contained <code>ui.html</code> that runs in a locked-down iframe and talks to the match over a tiny message bridge.</li>
      </ul>

      <div className="doc-cards">
        <Card title="Quickstart →" desc="Build, test, and publish your first game end to end." onClick={() => onNavigate("quickstart")} />
        <Card title="Game API →" desc="Every field of a game definition, with signatures." onClick={() => onNavigate("game-api")} />
        <Card title="Rendering →" desc="Legal-move buttons, board schema, or a custom UI." onClick={() => onNavigate("rendering")} />
        <Card title="Publishing →" desc="The manifest, the validation gates, and going live." onClick={() => onNavigate("publishing")} />
      </div>
    </article>
  );
}

function Quickstart() {
  return (
    <article className="doc">
      <h1>Quickstart</h1>
      <p className="doc-lede">Build a working game — Tic-Tac-Toe — and take it all the way to a published, playable marketplace entry.</p>

      <h2>1. Prerequisites</h2>
      <ul className="doc-list">
        <li><b>Node 22.6+</b> — the engine runs your TypeScript directly via type-stripping, so there is no build step while you iterate.</li>
        <li><b>Docker</b> — needed only for the final WebAssembly build and to publish (not for writing or testing logic).</li>
        <li>Clone the platform repo and install workspace deps:</li>
      </ul>
      <Code>{`git clone https://github.com/j3dyy/bordiko && cd bordiko
npm install`}</Code>

      <h2>2. Scaffold a game folder</h2>
      <p>Games live under <code>games/&lt;your-game-id&gt;/</code>. Create two files:</p>
      <Code>{`games/tic-tac-toe/
├── package.json     # the "bordiko" manifest block (used at publish time)
└── src/
    └── game.ts       # the whole game`}</Code>
      <p><code>package.json</code>:</p>
      <Code>{`{
  "name": "@bordiko/game-tic-tac-toe",
  "private": true,
  "type": "module",
  "bordiko": {
    "gameId": "tic-tac-toe",
    "displayName": "Tic-Tac-Toe",
    "minPlayers": 2,
    "maxPlayers": 2,
    "categories": ["classic"],
    "board": "grid"
  }
}`}</Code>

      <h2>3. Write the game</h2>
      <p>
        A game is a plain object matching the <code>GameDefinition</code> type. The shipped examples
        import the engine by relative path (the path depth depends on your folder):
      </p>
      <Code>{`// games/tic-tac-toe/src/game.ts
import type { GameDefinition } from "../../../packages/engine/src/index.ts";
import { INVALID_MOVE } from "../../../packages/engine/src/index.ts";

interface Ttt { cells: (string | null)[]; }

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export const game: GameDefinition<Ttt> = {
  name: "tic-tac-toe",
  minPlayers: 2,
  maxPlayers: 2,

  setup: () => ({ cells: Array(9).fill(null) }),

  moves: {
    // Claim a cell, then pass the turn.
    place(G, payload: { cell: number }, ctx) {
      const { cell } = payload;
      if (cell < 0 || cell > 8 || G.cells[cell]) return INVALID_MOVE;
      G.cells[cell] = ctx.playerId;
      ctx.flow.endTurn();
    },
  },

  // Run after every accepted move. Return a result to end the game.
  endIf: (G) => {
    for (const [a, b, c] of LINES) {
      if (G.cells[a] && G.cells[a] === G.cells[b] && G.cells[a] === G.cells[c]) {
        return { winner: G.cells[a]! };
      }
    }
    if (G.cells.every(Boolean)) return { draw: true };
  },

  // The legal moves right now — powers bots and the default UI.
  enumerate: (G) =>
    G.cells
      .map((v, i) => (v ? null : { type: "place", payload: { cell: i } }))
      .filter(Boolean) as { type: string; payload: { cell: number } }[],
};`}</Code>
      <Callout kind="warn">
        Mutate <code>G</code> in place — the engine hands your move a fresh clone and commits it only
        if the move is accepted. A rejected move (return <code>INVALID_MOVE</code>) is a pure no-op.
        Never touch <code>Date</code>, <code>Math.random()</code>, or module-level mutable state.
      </Callout>

      <h2>4. Test it instantly — no build, no Docker</h2>
      <p>Because the engine runs your <code>.ts</code> directly, unit tests are sub-second:</p>
      <Code>{`// games/tic-tac-toe/test/ttt.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMatch, applyMove } from "../../../packages/engine/src/index.ts";
import { game } from "../src/game.ts";

test("X takes the top row and wins", () => {
  let m = createMatch(game, { players: ["X", "O"], seed: "t1" });
  const script = [["X", 0], ["O", 3], ["X", 1], ["O", 4], ["X", 2]] as const;
  for (const [playerId, cell] of script) {
    const r = applyMove(game, m, { type: "place", playerId, payload: { cell } });
    assert.ok(r.ok, r.error);
    m = r.state;
  }
  assert.equal(m.result?.winner, "X");
});`}</Code>
      <Code>{`node --test games/tic-tac-toe/test/*.test.ts`}</Code>

      <h2>5. Play it in the sandbox</h2>
      <p>
        Fuzz the game to completion against bots and confirm it replays deterministically — the whole
        loop runs in Node. See <b>Testing &amp; the sandbox</b> for the local harness that lets you play
        every seat, fill seats with bots, hot-reload on save, and preview your custom UI.
      </p>

      <h2>6. Build to WebAssembly</h2>
      <p>When the logic is solid, compile the game to a sandboxed <code>.wasm</code> module:</p>
      <Code>{`docker compose -f infra/docker-compose.yml --profile wasm run --rm \\
  wasm-build tools/wasm/build.sh games/tic-tac-toe dist/tic-tac-toe.wasm`}</Code>

      <h2>7. Publish</h2>
      <Code>{`REGISTRY=https://api.bordiko.com/api ADMIN_TOKEN=<token> \\
  node tools/publish.mjs games/tic-tac-toe`}</Code>
      <p>
        The registry validates your module and stores it; the game host fetches it on demand the first
        time someone starts a match — no redeploy. Full details in <b>Publishing</b>.
      </p>
    </article>
  );
}

function GameApi() {
  return (
    <article className="doc">
      <h1>Game API</h1>
      <p className="doc-lede">
        A game is a <code>GameDefinition&lt;S&gt;</code>, where <code>S</code> is your state type. Only
        <code> name</code>, <code>minPlayers</code>, <code>maxPlayers</code>, <code>setup</code>, and
        <code> moves</code> are required.
      </p>

      <h2>Definition</h2>
      <Code>{`interface GameDefinition<S> {
  name: string;              // kebab-case id
  version?: string;
  minPlayers: number;
  maxPlayers: number;

  setup: (ctx: SetupContext) => S;
  moves: Record<string, MoveHandler<S>>;

  playerView?: (G: S, playerId: string, flow: FlowState) => Json;
  endIf?:      (G: S, flow: FlowState) => GameResult | void;
  enumerate?:  (G: S, playerId: string, flow: FlowState) => MoveDescriptor[];
  initialActive?: (G: S) => string[] | undefined;   // simultaneous opening
}`}</Code>

      <h2>setup(ctx)</h2>
      <p>Builds the initial state, deterministically. The context gives you the players and seeded randomness:</p>
      <Code>{`interface SetupContext {
  players: string[];
  numPlayers: number;
  random: RandomAPI;     // seeded — safe for shuffles/deals
  config?: Json;         // table options chosen in the lobby (e.g. teams)
}`}</Code>

      <h2>moves</h2>
      <p>Each move is a handler. It receives the (cloned) state, the client payload, and a context. Mutate <code>G</code>; return <code>INVALID_MOVE</code> to reject.</p>
      <Code>{`type MoveHandler<S> = (G: S, payload: Json, ctx: MoveContext) => void | typeof INVALID_MOVE;

interface MoveContext {
  playerId: string;                       // who is acting
  random: RandomAPI;                       // seeded randomness
  flow: FlowAPI;                           // turn / phase control
  emit: (type: string, data?: Json) => void;  // UI/animation events
  log: (msg: string) => void;
}`}</Code>

      <h2>Randomness — the only source allowed</h2>
      <p>Use <code>ctx.random</code> (and <code>SetupContext.random</code>) for everything random. It is seeded from the match seed, so replays are exact.</p>
      <Code>{`interface RandomAPI {
  float(): number;                 // [0, 1)
  int(minInclusive: number, maxInclusive: number): number;
  bool(p?: number): boolean;
  die(sides: number): number;
  dice(count: number, sides: number): number[];
  pick<T>(items: T[]): T;
  shuffle<T>(items: T[]): T[];     // returns a new shuffled array
}`}</Code>

      <h2>Turn &amp; phase control — flow</h2>
      <Code>{`interface FlowAPI {
  endTurn(): void;                        // pass to the next player
  setPhase(phase: string): void;
  currentPlayer(): string;
  playOrder(): string[];
  setActive(playerId: string): void;      // hand priority out of turn (reactions)
  setActiveSet(playerIds: string[]): void;// simultaneous stage (all act at once)
  turnOwner(): string;
  endGame(result: GameResult): void;
}`}</Code>

      <h2>playerView — hidden information</h2>
      <p>
        By default players see the whole state. Implement <code>playerView</code> to redact secrets:
        return only what <code>playerId</code> is allowed to see. This runs on the server, so a client
        can never receive data it shouldn't — the anti-cheat guarantee.
      </p>
      <Code>{`playerView: (G, playerId) => ({
  ...G,
  hands: undefined,                          // never ship everyone's hands
  yourHand: G.hands[playerId],               // just yours
  handCounts: mapValues(G.hands, (h) => h.length),
}),`}</Code>

      <h2>endIf &amp; results</h2>
      <p>Runs after every accepted move. Return a result to end the match (or nothing to continue):</p>
      <Code>{`interface GameResult {
  winner?: string;      // single winner
  winners?: string[];   // team / co-op winners
  losers?: string[];
  draw?: boolean;
  reason?: string;      // shown in the game-over card
}`}</Code>

      <h2>enumerate — legal moves</h2>
      <p>Return every legal move for <code>playerId</code> right now. Powers the built-in bots, the default button UI, and move highlighting.</p>
      <Code>{`interface MoveDescriptor { type: string; payload?: Json; }`}</Code>
      <Callout kind="tip">
        Even if you ship a custom UI, implementing <code>enumerate</code> is worth it: it gives you free
        bots to fill empty seats and to fuzz-test your rules to completion.
      </Callout>
    </article>
  );
}

function Rendering() {
  return (
    <article className="doc">
      <h1>Rendering your game</h1>
      <p className="doc-lede">
        Pick the level of UI effort that fits. All three paths use the same authoritative match — you
        can start with buttons and upgrade later without touching your game logic.
      </p>

      <h2>1. Nothing — legal-move buttons</h2>
      <p>
        Implement <code>enumerate</code> and you are done. The platform turns each legal move into a
        typed button. Perfect for prototyping and abstract games. This is the default for any published
        game that ships no board schema and no custom UI.
      </p>

      <h2>2. A declarative board</h2>
      <p>
        Return a <code>board</code> projection from <code>playerView</code> and the platform draws it —
        seats around a table, zones of cards, progress tracks, and a prompt for the acting player. No UI
        code, and it is automatically per-player redacted because it comes out of <code>playerView</code>.
      </p>
      <Code>{`playerView: (G, playerId) => ({
  // ...your redacted state...
  board: {
    kind: "tableau",
    seats: G.players.map((p) => ({ id: p, name: p, active: p === current })),
    zones: [{ id: "discard", label: "Discard", cards: [{ face: top }] }],
    prompt: playerId === current
      ? { text: "Your turn", moves: legalMovesFor(playerId) }
      : undefined,
  },
})`}</Code>
      <p>You can also ship image assets (PNG/JPEG/GIF/WebP) in an <code>assets/</code> folder and reference them from the schema.</p>

      <h2>3. Your own UI</h2>
      <p>
        Ship a single self-contained <code>ui.html</code> next to your game. It runs in a
        <b> locked-down iframe</b>: an opaque origin (no access to the host page, cookies, or session), a
        strict Content-Security-Policy with <b>no network access</b> at all, and no form actions. Its only
        channel to the world is a message bridge to the match.
      </p>
      <p>The bridge (from <code>@bordiko/sdk/ui</code>, or inline — it is tiny):</p>
      <Code>{`<!-- games/my-game/ui.html -->
<div id="app"></div>
<script type="module">
  // Receive redacted state; the host pushes it on every change.
  window.addEventListener("message", (e) => {
    if (e.data?.t !== "bordiko:state") return;
    const s = e.data.state;   // { G, legalMoves, yourTurn, names, playerId, ... }
    render(s);
  });
  // Tell the host we're ready (it replies with the first state).
  window.parent.postMessage({ t: "bordiko:ready" }, "*");

  // Propose a move — the server still validates it against your reducer.
  function play(cell) {
    window.parent.postMessage({ t: "bordiko:move", type: "place", payload: { cell } }, "*");
  }
</script>`}</Code>
      <Callout kind="note">
        A custom UI can only <i>propose</i> moves. Every move goes through the same server-side reducer
        that validates it, so an untrusted or buggy UI can never make an illegal move stick — and the
        no-network sandbox means it can never exfiltrate anything.
      </Callout>
      <p>
        Once your published game includes a <code>ui.html</code>, the catalog detects it and players get
        your custom UI automatically.
      </p>
    </article>
  );
}

function Publishing() {
  return (
    <article className="doc">
      <h1>Publishing</h1>
      <p className="doc-lede">Publishing uploads your compiled game to the registry, which validates it and serves it to the game host on demand.</p>

      <h2>The manifest</h2>
      <p>
        The <code>bordiko</code> block in your game's <code>package.json</code> is the manifest source.
        The publisher reads it, hashes your <code>.wasm</code>, bundles any assets and <code>ui.html</code>,
        and posts the package:
      </p>
      <Code>{`"bordiko": {
  "gameId": "my-game",        // lowercase kebab-case, unique
  "displayName": "My Game",
  "minPlayers": 2,
  "maxPlayers": 4,
  "categories": ["strategy"],
  "board": "grid"             // grid | hex | network | tableau | custom
}`}</Code>

      <h2>The command</h2>
      <Code>{`REGISTRY=https://api.bordiko.com/api ADMIN_TOKEN=<token> \\
  node tools/publish.mjs games/my-game`}</Code>
      <p>It sends the manifest, the base64 <code>.wasm</code>, any <code>assets/*</code> images, and an optional <code>ui.html</code>.</p>

      <h2>What the registry checks</h2>
      <p>Three gates run before anything is stored — this is what keeps an open marketplace safe:</p>
      <ol className="doc-list">
        <li><b>Manifest &amp; integrity</b> — the manifest is well-formed and the declared sha256 matches the uploaded module.</li>
        <li><b>Imports allow-list</b> — the WebAssembly module may import <i>only</i> <code>wasi_snapshot_preview1</code>. Any other host import is rejected, so the module can't reach the network, filesystem, or clock.</li>
        <li><b>Sandboxed setup scenario</b> — the registry actually runs your module in a memory-capped, time-limited sandbox with a <code>setup</code> command and requires it to produce valid state. A game that crashes on setup never publishes.</li>
      </ol>
      <p>Uploaded assets are size-limited and content-type sniffed (only real raster images pass). A custom <code>ui.html</code> is size-capped and served under the no-network CSP described in <b>Rendering</b>.</p>

      <h2>Going live</h2>
      <p>
        Once published, the game host fetches your module the first time a match starts — no redeploy,
        no downtime. It appears in the catalog immediately (subject to moderation, if enabled).
      </p>
      <Callout kind="note">
        Publishing to the hosted marketplace needs an admin token today while the platform is in early
        access. If you want to publish a game, get in touch and we'll set you up.
      </Callout>
    </article>
  );
}

function Sandbox() {
  return (
    <article className="doc">
      <h1>Testing &amp; the sandbox</h1>
      <p className="doc-lede">
        The fastest feedback loop lives entirely in Node — no Docker, no services, no browser. Reach for
        the heavier tools only when you want to see the real thing.
      </p>

      <h2>Unit tests (sub-second)</h2>
      <p>Your game's <code>.ts</code> runs directly, so tests are instant:</p>
      <Code>{`node --test games/my-game/test/*.test.ts`}</Code>
      <p>
        Drive the match with <code>createMatch</code>, <code>applyMove</code>, and
        <code> getPlayerView</code>, and assert on setup, legal/illegal moves, redaction (that a player's
        view never leaks a secret), and end conditions.
      </p>

      <h2>Bot self-play &amp; replay</h2>
      <p>
        If you implement <code>enumerate</code>, the engine's seeded bots can play your game to
        completion. Play a random game, then <code>replay</code> the move log and assert the final state
        is byte-identical — the determinism check that guarantees your game behaves the same in the WASM
        sandbox as it does in Node.
      </p>
      <Code>{`import { createMatch, randomBotMove, applyMove, replay, movesFromLog } from "../../../packages/engine/src/index.ts";

let s = createMatch(game, { players: ["a", "b"], seed: "fuzz" });
while (!s.ended) {
  const mv = randomBotMove(game, s, s.flow.currentPlayer, "botseed:" + s.log.length);
  s = applyMove(game, s, mv).state;
}
const replayed = replay(game, s.seed, ["a", "b"], movesFromLog(s));
// assert deepEqual(replayed.G, s.G)`}</Code>

      <h2>The local dev harness</h2>
      <p>Point the sandbox at your game folder — no build, no Docker, no login:</p>
      <Code>{`npm run sandbox -- games/my-game`}</Code>
      <p>It opens a browser harness that drives the same reducer the WASM host runs. In it you can:</p>
      <ul className="doc-list">
        <li><b>Play every seat</b> — click a seat to sit in it; each seat sees only its own redacted view, so you can test hidden information from every angle.</li>
        <li><b>Fill seats with bots</b> — flip any seat to a bot, then <i>Step</i> one move at a time or <i>auto-play</i>. Bots use your <code>enumerate</code>; set every seat to a bot to watch a whole game.</li>
        <li><b>Hot-reload on save</b> — edit your game and the match restarts with the new rules instantly.</li>
        <li><b>Preview your custom UI</b> — a <code>ui.html</code> loads in the same locked-down sandbox iframe players get, over the real message bridge.</li>
        <li><b>Inspect everything</b> — a live panel shows the phase and turn, the current seat's redacted state, its legal moves, and the move log.</li>
      </ul>
      <p>Options: <code>--seats N</code>, <code>--seed &lt;s&gt;</code>, <code>--port &lt;p&gt;</code>, and <code>--config '&#123;...&#125;'</code> for table options like teams.</p>
      <Callout kind="tip">
        For a full end-to-end check against the real gateway and game host — accounts, lobby, WebSocket,
        chat — run <code>npm run dev</code> and open two browser tabs.
      </Callout>
    </article>
  );
}
