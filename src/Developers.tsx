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
  { id: "realtime", title: "Real-time games" },
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
    case "realtime": return <Realtime />;
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
      <p>
        That is a <b>turn-based</b> game. To build a <b>real-time action</b> game — where the world keeps
        moving on its own, with both players acting at once — you add one more function, <code>tick</code>,
        and the host drives a fixed-rate clock. See <b>Real-time games</b>.
      </p>

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
        <Card title="Real-time games →" desc="Continuous action: a tick clock, simultaneous input, physics." onClick={() => onNavigate("realtime")} />
        <Card title="Publishing →" desc="The manifest, the validation gates, and going live." onClick={() => onNavigate("publishing")} />
      </div>
    </article>
  );
}

function Quickstart() {
  return (
    <article className="doc">
      <h1>Quickstart</h1>
      <p className="doc-lede">Scaffold a game, play it against bots, compile it to WebAssembly, and publish it — all from your own project, with just Node installed.</p>

      <h2>1. Scaffold a game</h2>
      <p>You need <b>Node 22.6+</b> — and nothing else (the build step fetches its own compiler; no Docker).</p>
      <Code>{`npm create @bordiko/game my-game
cd my-game
npm install`}</Code>
      <p>You get a ready-to-run project. Your whole game is <code>src/game.ts</code>:</p>
      <Code>{`my-game/
├── package.json      # your game's manifest (the "bordiko" block)
├── src/game.ts        # the whole game — a starter Tic-Tac-Toe
└── test/game.test.ts`}</Code>

      <h2>2. Write the game</h2>
      <p>A game is a deterministic reducer, built with <code>defineGame</code> from <code>@bordiko/sdk</code>:</p>
      <Code>{`// src/game.ts
import { defineGame, INVALID_MOVE } from "@bordiko/sdk";

interface State { board: (string | null)[]; }

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export default defineGame<State>({
  name: "my-game",
  minPlayers: 2,
  maxPlayers: 2,
  meta: { displayName: "My Game" },

  setup: () => ({ board: Array(9).fill(null) }),

  moves: {
    // Claim an empty cell, then pass the turn.
    place: (G, payload, ctx) => {
      const cell = (payload as { cell?: number }).cell;
      if (typeof cell !== "number" || cell < 0 || cell > 8 || G.board[cell]) return INVALID_MOVE;
      G.board[cell] = ctx.playerId;
      ctx.flow.endTurn();
    },
  },

  // Runs after every accepted move; return a result to end the game.
  endIf: (G) => {
    for (const [a, b, c] of LINES)
      if (G.board[a] && G.board[a] === G.board[b] && G.board[a] === G.board[c])
        return { winner: G.board[a]! };
    if (G.board.every(Boolean)) return { draw: true };
  },

  // The legal moves right now — powers bots and the default UI.
  enumerate: (G) => G.board.flatMap((v, i) => (v ? [] : [{ type: "place", payload: { cell: i } }])),
});`}</Code>
      <Callout kind="warn">
        Mutate <code>G</code> in place — the engine gives your move a fresh clone and commits it only if
        accepted; a rejected move (<code>return INVALID_MOVE</code>) is a pure no-op. Never touch
        <code> Date</code> or <code>Math.random()</code> — use <code>ctx.random</code> for anything random.
      </Callout>

      <h2>3. Test it — instant, no build</h2>
      <p>Your game runs as plain TypeScript, so the tests are sub-second:</p>
      <Code>{`npm test`}</Code>

      <h2>4. Play it in the sandbox</h2>
      <p>Open a local table — play every seat, fill seats with bots, hot-reload on save, and preview a custom UI:</p>
      <Code>{`npm run dev`}</Code>
      <p>More in <b>Testing &amp; the sandbox</b>.</p>

      <h2>5. Compile to WebAssembly</h2>
      <p>When the logic is solid, build the sandboxed module. The first build downloads its compiler (Javy) — no Docker:</p>
      <Code>{`npm run build   # → dist/my-game.wasm`}</Code>

      <h2>6. Publish</h2>
      <Code>{`REGISTRY=https://api.bordiko.com/api ADMIN_TOKEN=<token> npm run publish:game`}</Code>
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
        You build a game with <code>defineGame</code> from <code>@bordiko/sdk</code>, which validates a
        <code> GameDefinition&lt;S&gt;</code> (where <code>S</code> is your state type) and attaches display
        metadata. Only <code>name</code>, <code>minPlayers</code>, <code>maxPlayers</code>, <code>setup</code>,
        and <code>moves</code> are required.
      </p>
      <Code>{`import { defineGame, INVALID_MOVE } from "@bordiko/sdk";`}</Code>

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

  tick?: (G: S, dt: number, ctx: TickContext) => void;  // real-time — see "Real-time games"
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
      <Code>{`<!-- ui.html (next to package.json) -->
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

      <h2>Chat, fullscreen &amp; host actions</h2>
      <p>The bridge gives your UI a few more things the platform normally provides:</p>
      <Code>{`import { connectBordiko } from "@bordiko/sdk/ui";
const host = connectBordiko();

host.fullscreen();               // ask the host to fullscreen the game stage
host.debug("spawned", { x, y }); // send a line to the developer debug panel

// Chat: render it INSIDE your game instead of the platform's sidebar.
host.chat("gg");                 // send a message to the table
host.onChat(m => addLine(m.name + ": " + m.text)); // receive messages`}</Code>
      <p>
        To take over chat, set <code>"ownChat": true</code> in your game's catalog metadata. The platform
        then <b>hides its default chat sidebar</b> (your board goes full-width) and relays messages into your
        UI via <code>onChat</code> — draw them however you like.
      </p>
      <Callout kind="tip">
        <b>Fullscreen is truly immersive.</b> When a player goes fullscreen the platform hides its own chat
        and rating chrome, so your UI fills the screen. Anything you draw yourself — HUD, your own chat —
        goes with it. <code>games/arena-shooter</code> is a full example (3D WebGL UI + in-game chat).
      </Callout>
    </article>
  );
}

function Realtime() {
  return (
    <article className="doc">
      <h1>Real-time games</h1>
      <p className="doc-lede">
        Most Bordiko games are turn-based — the world only changes when someone moves. A <b>real-time</b>
        game keeps moving on its own: platforms slide, projectiles fly, and both players act at once. You
        opt in with one manifest flag and one extra reducer function; everything else — sandbox, matchmaking,
        chat, reconnection — is identical.
      </p>

      <h2>How it works</h2>
      <p>
        When your game is real-time, the host runs a <b>fixed-rate clock</b>: while a match is being watched,
        it calls your <code>tick(G, dt)</code> that many times per second to advance the world. Players don't
        take turns — everyone can send input at any moment, and the clock integrates it. The clock stops when
        the room empties or the match ends.
      </p>

      <h2>1. The tick handler</h2>
      <p>Add <code>tick</code> to your definition. <code>dt</code> is the <b>fixed</b> timestep in milliseconds (from your declared rate) — never a wall-clock delta, so replays stay byte-identical.</p>
      <Code>{`interface TickContext {
  dt: number;                                 // fixed timestep (ms) = 1000 / tickRate
  random: RandomAPI;                          // seeded — shared with moves
  emit: (type: string, data?: Json) => void;  // UI/animation events
  endGame: (result: GameResult) => void;      // e.g. a player was pushed out
}

tick: (G, dt, ctx) => {
  const step = dt / 1000;                     // seconds
  for (const b of G.bodies) {                 // step your physics by the FIXED step
    b.x += b.vx * step;
    b.y += b.vy * step;
  }
}`}</Code>

      <h2>2. Buffer input, integrate it in tick</h2>
      <p>
        The real-time convention: a move only <i>records</i> a player's intent into the state; <code>tick</code>
        reads it and advances the sim. This keeps input and simulation cleanly separated and fully
        deterministic. Seed <code>initialActive</code> with every seat so all players can act at once.
      </p>
      <Code>{`initialActive: (G) => G.bodies.map((b) => b.id),   // everyone active — no turns

moves: {
  // Records the held thrust direction; does NOT move anything itself.
  input: (G, payload, ctx) => {
    const b = G.bodies.find((x) => x.id === ctx.playerId);
    if (!b) return INVALID_MOVE;
    b.ax = clampUnit((payload as any).ax);
    b.ay = clampUnit((payload as any).ay);
  },
},`}</Code>

      <h2>3. Declare it in the manifest</h2>
      <Code>{`"bordiko": {
  "gameId": "sumo",
  "displayName": "Sumo",
  "minPlayers": 2, "maxPlayers": 2,
  "board": "custom",
  "realtime": { "tick": true, "tickRate": 15 }   // ticks per second, max 30
}`}</Code>

      <h2>4. A UI that interpolates</h2>
      <p>
        The host sends state at the tick rate; your UI smooths between frames. Subscribe with the same
        bridge from <b>Rendering</b>, send <code>input</code> moves, and render on
        <code> requestAnimationFrame</code>, easing toward the latest snapshot:
      </p>
      <Code>{`let latest = null;
window.addEventListener("message", (e) => { if (e.data?.t === "bordiko:state") latest = e.data.state; });

// hold a key -> send the thrust vector once, on change
function onInput(ax, ay) { window.parent.postMessage({ t: "bordiko:move", type: "input", payload: { ax, ay } }, "*"); }

function frame() {
  requestAnimationFrame(frame);
  if (!latest) return;
  for (const b of latest.G.bodies) drawEased(b);   // lerp render pos -> b
}
requestAnimationFrame(frame);`}</Code>
      <p>
        Fullscreen is one line — a sandboxed UI can't call the Fullscreen API itself, so ask the host:
        <code> connectBordiko().fullscreen()</code> (or post <code>{`{ t: "bordiko:fullscreen" }`}</code>).
      </p>

      <Callout kind="warn">
        <b>Determinism still rules.</b> In <code>tick</code>, use only the fixed <code>dt</code> and
        <code> ctx.random</code> — never <code>Date</code> or <code>Math.random()</code>. And because the UI
        runs under a no-network sandbox, it can't open its own socket: all sync flows through the host clock.
        PixiJS works, but import <code>@pixi/unsafe-eval</code> (the CSP forbids <code>eval</code>); plain
        canvas 2D needs nothing.
      </Callout>

      <Callout kind="tip">
        The reference is <code>games/sumo</code> — a 2-player physics duel: a deterministic reducer, its
        tests, and a self-contained canvas UI you can copy from.
      </Callout>
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
      <p>A <b>real-time</b> game adds a <code>realtime</code> block so the host drives its clock (see <b>Real-time games</b>):</p>
      <Code>{`"realtime": { "tick": true, "tickRate": 15 }   // ticks per second, max 30`}</Code>

      <h2>The command</h2>
      <p>From your game project, after <code>npm run build</code>:</p>
      <Code>{`REGISTRY=https://api.bordiko.com/api ADMIN_TOKEN=<token> npm run publish:game`}</Code>
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

      <h2>The dev sandbox</h2>
      <p>The main tool — a local table for your game, in the browser, no login or services:</p>
      <Code>{`npm run dev`}</Code>
      <p>It drives the same reducer the WASM host runs, so what you see is what players get. You can:</p>
      <ul className="doc-list">
        <li><b>Play every seat</b> — click a seat to sit in it; each seat sees only its own redacted view, so you can test hidden information from every angle.</li>
        <li><b>Fill seats with bots</b> — flip any seat to a bot, then <i>Step</i> one move or <i>auto-play</i>. Bots use your <code>enumerate</code>; set every seat to a bot to watch a whole game.</li>
        <li><b>Hot-reload on save</b> — edit your game and the match restarts with the new rules instantly.</li>
        <li><b>Preview your custom UI</b> — a <code>ui.html</code> loads in the same locked-down sandbox iframe players get, over the real message bridge.</li>
        <li><b>Inspect everything</b> — a live panel shows the phase and turn, the current seat's redacted state, its legal moves, and the move log.</li>
      </ul>

      <h2>Unit tests (sub-second)</h2>
      <p>Your game runs as plain TypeScript, so tests are instant — no build, no Docker:</p>
      <Code>{`npm test`}</Code>
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
        sandbox as in Node.
      </p>
      <Code>{`import { createMatch, applyMove, randomBotMove, replay, movesFromLog, Rng, seedFromString } from "@bordiko/sdk";
import game from "./src/game.ts";

let s = createMatch(game, { players: ["a", "b"], seed: "fuzz" });
while (!s.ended) {
  const mv = randomBotMove(game, s, new Rng(seedFromString("bot:" + s.log.length)));
  if (!mv) break;
  s = applyMove(game, s, mv).state;
}
const replayed = replay(game, s.seed, ["a", "b"], movesFromLog(s));
// assert.deepEqual(replayed.G, s.G)`}</Code>

      <h2>The in-game debug panel</h2>
      <p>
        Your custom UI runs in a locked-down iframe, so its console is invisible from the outside — which
        makes a broken board hard to diagnose. Open any game with <code>?debug</code> in the URL (or press
        <b> Ctrl+Shift+D</b>) to reveal a developer panel with two things you otherwise can't see:
      </p>
      <ul className="doc-list">
        <li><b>Console</b> — uncaught errors, <code>console.error</code>/<code>console.warn</code>, and anything you send with <code>host.debug(...)</code>, forwarded out of the sandbox.</li>
        <li><b>State</b> — the live redacted state, legal moves, and turn info the reducer produced, so you can see exactly what your UI was handed.</li>
      </ul>
      <Code>{`import { connectBordiko } from "@bordiko/sdk/ui";
const host = connectBordiko();

// This line shows up in the debug panel (errors/warnings appear automatically):
host.debug("bullet spawned", { x, y, vel });`}</Code>

      <Callout kind="tip">
        The sandbox runs the real engine, so it's all you need to build and tune your game. Publishing is
        what puts it in front of other players.
      </Callout>
    </article>
  );
}
