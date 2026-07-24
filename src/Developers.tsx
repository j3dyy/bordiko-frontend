import { useEffect, useState, type ReactNode, type CSSProperties } from "react";
import { publishGame, fetchMyGames, setMyGameEnabled } from "./api.ts";
import type { ModerationGame } from "./wire.ts";

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
  { id: "publish", title: "Publish a game" },
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
          <Content id={current.id} onNavigate={onNavigate} signedIn={signedIn} />

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

function Content({ id, onNavigate, signedIn }: { id: string; onNavigate: (page: string) => void; signedIn: boolean }) {
  switch (id) {
    case "quickstart": return <Quickstart />;
    case "game-api": return <GameApi />;
    case "rendering": return <Rendering />;
    case "realtime": return <Realtime />;
    case "publishing": return <Publishing />;
    case "sandbox": return <Sandbox />;
    case "publish": return <Publish signedIn={signedIn} />;
    default: return <Overview onNavigate={onNavigate} />;
  }
}

/* -------------------------- publish a game (form) ----------------------- */

const BOARD_KINDS = ["custom", "grid", "hex", "network", "tableau"] as const;

// One entry per game (the list arrives newest-version-first, so keep the first).
function dedupeByGame(list: ModerationGame[]): ModerationGame[] {
  const seen = new Set<string>();
  const out: ModerationGame[] = [];
  for (const g of list) {
    if (seen.has(g.gameId)) continue;
    seen.add(g.gameId);
    out.push(g);
  }
  return out;
}

// Chunked base64 for the wasm (arrayBuffer → base64) without blowing the call stack.
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function PubStatusPill({ status }: { status: string }) {
  const c =
    status === "published"
      ? { bg: "#22c55e22", fg: "#15803d" }
      : status === "rejected"
        ? { bg: "#ef444422", fg: "#b91c1c" }
        : { bg: "#facc1522", fg: "#b8860b" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.fg,
        borderRadius: 999,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 600,
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function Publish({ signedIn }: { signedIn: boolean }) {
  const [gameId, setGameId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [version, setVersion] = useState("0.1.0");
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [board, setBoard] = useState<string>("custom");
  const [category, setCategory] = useState("");
  const [wasmFile, setWasmFile] = useState<File | null>(null);
  const [uiFile, setUiFile] = useState<File | null>(null);
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [mine, setMine] = useState<ModerationGame[] | null>(null);

  async function loadMine() {
    try {
      setMine(await fetchMyGames());
    } catch {
      setMine([]);
    }
  }

  async function toggleMine(g: ModerationGame) {
    const next = !(g.enabled ?? true);
    setMine((ms) => ms?.map((x) => (x.gameId === g.gameId ? { ...x, enabled: next } : x)) ?? null);
    try {
      await setMyGameEnabled(g.gameId, next);
    } catch {
      await loadMine(); // roll back to the server's truth
    }
  }
  useEffect(() => {
    if (signedIn) void loadMine();
  }, [signedIn]);

  async function submit() {
    setMsg(null);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(gameId)) return setMsg({ ok: false, text: "Game id must be lowercase kebab-case." });
    if (!/^\d+\.\d+\.\d+$/.test(version)) return setMsg({ ok: false, text: "Version must be semver, e.g. 0.1.0." });
    if (!wasmFile) return setMsg({ ok: false, text: "A compiled .wasm is required." });
    if (sourceFiles.length === 0) return setMsg({ ok: false, text: "At least one source file is required." });

    setBusy(true);
    try {
      const wasm = toBase64(new Uint8Array(await wasmFile.arrayBuffer()));
      const ui = uiFile ? await uiFile.text() : "";
      // Concatenate the chosen source files into one readable bundle.
      const parts: string[] = [];
      for (const f of sourceFiles) {
        parts.push(`// ==== ${f.name} ====\n${await f.text()}`);
      }
      const source = btoa(unescape(encodeURIComponent(parts.join("\n\n"))));
      const manifest: Record<string, unknown> = {
        schema: 1,
        gameId,
        version,
        displayName: displayName || gameId,
        board,
        players: { min: minPlayers, max: maxPlayers },
        ...(category ? { category } : {}),
      };
      const created = await publishGame({ manifest, wasm, source, ...(ui ? { ui } : {}) });
      setMsg({ ok: true, text: `Submitted — ${created.gameId}@${created.version} is now pending review.` });
      await loadMine();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  if (!signedIn) {
    return (
      <article className="doc">
        <h1>Publish a game</h1>
        <p className="doc-lede">Sign in to submit a game for review.</p>
        <Callout kind="note">
          Publishing is self-service: sign in, upload your compiled <code>.wasm</code> plus its source, and it enters
          the review queue. An admin reviews it before it goes live in the catalog.
        </Callout>
      </article>
    );
  }

  const label: CSSProperties = { display: "block", fontSize: 13, fontWeight: 600, margin: "12px 0 4px" };
  const input: CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #d0cbe0", font: "inherit" };

  return (
    <article className="doc">
      <h1>Publish a game</h1>
      <p className="doc-lede">
        Upload your compiled game and its source. Every submission is reviewed by an admin before it appears in the
        catalog — source is required so we can read it.
      </p>

      <div style={{ maxWidth: 560 }}>
        <label style={label}>Game id (lowercase-kebab)</label>
        <input style={input} value={gameId} onChange={(e) => setGameId(e.target.value.trim())} placeholder="my-game" />

        <label style={label}>Display name</label>
        <input style={input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My Game" />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Version</label>
            <input style={input} value={version} onChange={(e) => setVersion(e.target.value.trim())} placeholder="0.1.0" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Board</label>
            <select style={input} value={board} onChange={(e) => setBoard(e.target.value)}>
              {BOARD_KINDS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={label}>Min players</label>
            <input style={input} type="number" min={1} max={10} value={minPlayers} onChange={(e) => setMinPlayers(+e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Max players</label>
            <input style={input} type="number" min={1} max={10} value={maxPlayers} onChange={(e) => setMaxPlayers(+e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Category <span className="doc-opt">(optional)</span></label>
            <input style={input} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="strategy" />
          </div>
        </div>

        <label style={label}>Compiled game (.wasm) — required</label>
        <input type="file" accept=".wasm" onChange={(e) => setWasmFile(e.target.files?.[0] ?? null)} />

        <label style={label}>Custom UI (ui.html) — optional</label>
        <input type="file" accept=".html" onChange={(e) => setUiFile(e.target.files?.[0] ?? null)} />

        <label style={label}>Source files — required (select one or more)</label>
        <input type="file" multiple onChange={(e) => setSourceFiles(Array.from(e.target.files ?? []))} />
        {sourceFiles.length > 0 && (
          <p className="doc-opt" style={{ margin: "4px 0 0" }}>{sourceFiles.map((f) => f.name).join(", ")}</p>
        )}

        <div style={{ marginTop: 16 }}>
          <button className="doc-card" style={{ padding: "10px 18px", cursor: "pointer" }} disabled={busy} onClick={() => void submit()}>
            {busy ? "Submitting…" : "Submit for review"}
          </button>
        </div>

        {msg && (
          <div className={`doc-callout ${msg.ok ? "tip" : "warn"}`} style={{ marginTop: 12 }}>
            <span className="doc-callout-tag">{msg.ok ? "Submitted" : "Error"}</span>
            <div>{msg.text}</div>
          </div>
        )}
      </div>

      <h2 style={{ marginTop: 28 }}>My games</h2>
      <p className="doc-opt">Manage the games you've published — toggle each on or off in the catalog.</p>
      {mine === null ? (
        <p className="doc-opt">Loading…</p>
      ) : mine.length === 0 ? (
        <p className="doc-opt">You haven't submitted any games yet.</p>
      ) : (
        <ul className="doc-list" style={{ listStyle: "none", padding: 0 }}>
          {dedupeByGame(mine).map((g) => (
            <li key={g.gameId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #eee6f5" }}>
              <b>{g.displayName || g.gameId}</b>
              <span className="doc-opt">{g.gameId}@{g.version}</span>
              <PubStatusPill status={g.status} />
              {g.status === "rejected" && g.rejectReason && <span className="doc-opt">— {g.rejectReason}</span>}
              {g.status === "published" && (
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="doc-opt">{(g.enabled ?? true) ? "Live" : "Disabled"}</span>
                  <button
                    onClick={() => void toggleMine(g)}
                    style={{ padding: "4px 12px", borderRadius: 8, border: "1px solid #d8cdf0", background: (g.enabled ?? true) ? "#fff" : "#efe9fb", cursor: "pointer" }}
                  >
                    {(g.enabled ?? true) ? "Disable" : "Enable"}
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
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
      <p>Generate a publish token on your <b>Profile → Publish from the CLI</b>, then:</p>
      <Code>{`REGISTRY=https://api.bordiko.com/api BORDIKO_TOKEN=<token> npx @bordiko/cli publish`}</Code>
      <p>
        The registry validates your module and stores it; it enters the review queue and, once an admin
        approves it, the game host fetches it on demand — no redeploy. Full details in <b>Publishing</b>.
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
  winner?: string;                   // single winner
  winners?: string[];                // team / co-op winners
  draw?: boolean;                    // ended with no winner
  scores?: Record<string, number>;   // final scores, when the game is scored
  reason?: string;                   // shown in the game-over card
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

// Events: react to what the reducer emitted with ctx.emit(...) — effects & sound.
host.onEvent(e => { if (e.type === "hit") spark(e.data); }); // fire-and-forget

// Chat: render it INSIDE your game instead of the platform's sidebar.
host.chat("gg");                 // send a message to the table
host.onChat(m => addLine(m.name + ": " + m.text)); // receive messages`}</Code>
      <p>
        Rendering chat inside your game is <b>own-chat mode</b>: the platform <b>hides its default chat
        sidebar</b> (your board goes full-width) and relays table messages into your UI via <code>onChat</code>
        instead. It's currently switched on per game on the platform side for immersive titles like{" "}
        <code>arena-shooter</code>; by default a custom UI keeps Bordiko's own chat sidebar. The
        <code> fullscreen</code>, <code>debug</code> and <code>onEvent</code> bridges above work in any custom UI.
      </p>

      <h2>Events — trigger effects &amp; sound from the reducer</h2>
      <p>
        Your reducer can <code>emit</code> a UI event from any move or tick. The host relays it to your UI,
        where <code>host.onEvent</code> receives it. This is the clean way to fire a hit-spark, a sound, a
        screen shake, or a floating damage number — <b>without diffing state</b> to guess what changed.
      </p>
      <Code>{`// reducer (runs server-side, in the WASM sandbox):
hurt(target, dmg, ctx.emit);
function hurt(p, dmg, emit) { p.hp -= dmg; emit("hit", { x: p.x, z: p.z, dmg }); }
// on a rocket:  emit("blast", { x, z, r });

// your UI:
host.onEvent(e => {
  if (e.type === "hit")   floatDamage(e.data.x, e.data.z, e.data.dmg);
  if (e.type === "blast") spawnExplosion(e.data.x, e.data.z, e.data.r);
});`}</Code>
      <Callout kind="tip">
        <b>Events are non-authoritative.</b> They are fire-and-forget presentation only: a UI that misses one
        just skips that effect, and <b>replays and reconnection ignore them</b>. Never drive game logic from an
        event — keep anything that must be true in the authoritative state <code>G</code>. Because they're not
        state, they don't bloat what every client downloads each tick. <code>games/arena-shooter</code> uses
        this exact pattern: its damage numbers and explosions are <code>emit</code>ted, not stored.
      </Callout>
      <Callout kind="tip">
        <b>Fullscreen is truly immersive.</b> When a player goes fullscreen the platform hides its own chat
        and rating chrome, so your UI fills the screen. Anything you draw yourself — HUD, your own chat —
        goes with it. <code>games/arena-shooter</code> is a full example (3D WebGL UI, in-game chat, four
        weapons with area-damage rockets, HP potions, floating damage numbers, and over-head HP bars).
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

      <p>
        A <b>turn-based</b> game can add an optional <code>timers</code> block for a turn clock. Because a reducer
        is time-blind, the <b>gateway</b> enforces the clock — on expiry it either auto-plays a safe move or ends
        the match. Declare <i>either</i> a per-turn limit <i>or</i> a chess clock:
      </p>
      <Code>{`"timers": { "perTurnSeconds": 45, "onExpire": "autoMove" }  // resets each turn; autoMove | forfeit
"timers": { "totalSeconds": 300 }                          // chess clock: 5 min per player, flag-fall = loss`}</Code>
      <p>
        Omit it to inherit the platform default (a per-turn limit that auto-plays the first legal move).{" "}
        <code>perTurnSeconds: 0</code> disables the turn timer entirely.
      </p>

      <h2>Two ways to publish</h2>
      <p>
        <b>From the web</b> (simplest): sign in and use <b>Developers → Publish a game</b> to upload your{" "}
        <code>.wasm</code>, optional <code>ui.html</code>, and source. <b>From the CLI</b>, generate a
        <b> publish token</b> on your <b>Profile → Publish from the CLI</b> (a revocable, 1-year credential — not
        your login), then after <code>npm run build</code>:
      </p>
      <Code>{`BORDIKO_TOKEN=<token> REGISTRY=https://api.bordiko.com/api npx @bordiko/cli publish`}</Code>
      <p>
        Either way, your submission is <b>tagged to your account</b> and <b>enters the review queue</b> — an admin
        reviews the code and approves it before it goes live. It sends the manifest, the base64 <code>.wasm</code>,
        your <b>source bundle</b> (required), any <code>assets/*</code> images, and an optional <code>ui.html</code>.
        Manage your submissions and toggle your live games under <b>My games</b> on the Publish page.
      </p>

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
        Your submission enters the <b>review queue</b>; once an admin approves it, the game host fetches your
        module the first time a match starts — no redeploy, no downtime — and it shows in the catalog.
      </p>
      <Callout kind="note">
        Publishing is self-service and open: sign in, generate a publish token on your <b>Profile</b>, and submit —
        every submission goes through the same review queue before it appears in the catalog.
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
