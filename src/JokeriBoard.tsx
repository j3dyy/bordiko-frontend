import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Card, SuitGlyph } from "./CardArt.tsx";
import { TEAM_COLORS } from "./TableSetup.tsx";
import { soundCardPlay, soundTrickWon } from "./sound.ts";
import type { StateMsg } from "./wire.ts";

interface JCard {
  r: string;
  s: string;
}
interface TrickCard {
  player: string;
  card: JCard;
  jokerMode?: "high" | "low";
}
interface JHandResult {
  handIndex: number;
  handSize: number;
  trump: string | null;
  bids: Record<string, number>;
  taken: Record<string, number>;
  delta: Record<string, number>;
}
interface JokeriView {
  players: string[];
  mode: "solo" | "teams";
  teams: string[][];
  phase: "trump" | "bid" | "play" | "done";
  handIndex: number;
  handCount: number;
  handSize: number;
  dealer: string;
  trump: string | null;
  trumpCard: JCard | null;
  firstActor: string;
  toAct: string;
  leader: string;
  calledSuit: string | null;
  trick: TrickCard[];
  lastTrick: TrickCard[];
  lastTrickWinner: string | null;
  bids: Record<string, number | null>;
  taken: Record<string, number>;
  scores: Record<string, number>;
  handResults: JHandResult[];
  handCounts: Record<string, number>;
  hand: JCard[];
}

const SUITS = ["S", "H", "D", "C"];
const isJoker = (c: JCard) => c.r === "6" && (c.s === "S" || c.s === "C");
const key = (c: JCard) => c.r + c.s;

// player ids are like "dev:alice" or an OAuth id — show a friendly-ish label.
function shortName(id: string): string {
  const base = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
  return base.length <= 12 ? base.charAt(0).toUpperCase() + base.slice(1) : base.slice(0, 6) + "…";
}

function roundOf(handIndex: number): { round: number; label: string } {
  if (handIndex < 8) return { round: 1, label: `Round 1 · deal ${handIndex + 1}/8` };
  if (handIndex < 12) return { round: 2, label: `Round 2 · deal ${handIndex - 7}/4` };
  if (handIndex < 20) return { round: 3, label: `Round 3 · deal ${handIndex - 11}/8` };
  return { round: 4, label: `Round 4 · deal ${handIndex - 19}/4` };
}

// A card-table renderer for Jokeri: opponents around the desk with their bid /
// tricks, the live trick in the middle, your hand fanned below, and a left-hand
// "scoresheet" paper — the traditional grid where each deal is a row and every
// cell is written "bid │ points" (see ScoreGrid).
export function JokeriBoard({
  state,
  playerId,
  onMove,
}: {
  state: StateMsg;
  playerId: string;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
}) {
  const G = state.G as JokeriView;
  const [picker, setPicker] = useState<JCard | null>(null); // a Joker awaiting high/low (+ suit)
  const [playing, setPlaying] = useState<string | null>(null);

  useEffect(() => {
    setPicker(null);
    setPlaying(null);
  }, [state.moveCount, G.phase, G.toAct]);

  // Play a sound for each card played — a distinct pitch per seat (a "different
  // voice" per player) — plus a chime when a trick is taken.
  const soundRef = useRef<{ mc: number; trickLen: number; lastWinner: string | null } | null>(null);
  useEffect(() => {
    const cur = { mc: state.moveCount, trickLen: G.trick.length, lastWinner: G.lastTrickWinner ?? null };
    const prev = soundRef.current;
    soundRef.current = cur;
    if (!prev || cur.mc === prev.mc) return; // first render / no new move
    const seat = (p: string) => G.players.indexOf(p);
    if (cur.lastWinner && cur.lastWinner !== prev.lastWinner && G.lastTrick.length > 0) {
      const last = G.lastTrick[G.lastTrick.length - 1]; // the card that completed the trick
      if (last) soundCardPlay(seat(last.player), last.player === playerId);
      soundTrickWon();
    } else if (cur.trickLen > prev.trickLen && G.trick.length > 0) {
      const last = G.trick[G.trick.length - 1];
      if (last) soundCardPlay(seat(last.player), last.player === playerId);
    }
  }, [state.moveCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const legal = state.yourTurn ? state.legalMoves ?? [] : [];
  const playableKeys = useMemo(() => {
    const set = new Set<string>();
    for (const m of legal) {
      if (m.type === "play") {
        const c = (m.payload as { card?: JCard } | undefined)?.card;
        if (c) set.add(key(c));
      }
    }
    return set;
  }, [legal]);

  const me = playerId;
  const isLead = G.trick.length === 0;
  const teamColor = (p: string) => {
    if (G.mode !== "teams") return "";
    const idx = G.teams.findIndex((t) => t.includes(p));
    return idx >= 0 ? TEAM_COLORS[idx % TEAM_COLORS.length] : "";
  };
  // Seat everyone around the table relative to me: I'm at the bottom (south), my
  // partner sits across (north), opponents left (west) and right (east). This is
  // how the four sit face to face at a real Jokeri table.
  const DIRS = ["south", "west", "north", "east"] as const;
  const myIdx = G.players.indexOf(me);
  const compassOf = (p: string) => DIRS[(((G.players.indexOf(p) - myIdx) % 4) + 4) % 4];
  const seatOf = (dir: string) => G.players.find((p) => compassOf(p) === dir);
  // Prefer the player's display name (from the gateway) over the raw id.
  const nameOf = (id: string) => state.names?.[id] ?? shortName(id);

  /* ------------------------------- actions ------------------------------- */
  function clickCard(c: JCard) {
    if (!state.yourTurn || G.phase !== "play" || !playableKeys.has(key(c))) return;
    if (isJoker(c)) {
      setPicker(c);
      return;
    }
    setPlaying(key(c));
    onMove("play", { card: c });
  }
  function playJoker(mode: "high" | "low", suit?: string) {
    if (!picker) return;
    setPlaying(key(picker));
    onMove("play", { card: picker, joker: suit ? { mode, suit } : { mode } });
    setPicker(null);
  }

  const { label: roundLabel } = roundOf(G.handIndex);
  const trumpLabel = G.trump ? null : "No trump";

  const hint = state.ended
    ? "Match over."
    : G.phase === "trump"
      ? state.yourTurn
        ? "Choose the trump suit for this deal — or no-trump."
        : `${nameOf(G.toAct)} is choosing the trump…`
      : G.phase === "bid"
        ? state.yourTurn
          ? "Declare how many tricks you'll take (0 to pass)."
          : `${nameOf(G.toAct)} is bidding…`
        : state.yourTurn
          ? isLead
            ? "Your lead — play any card."
            : G.calledSuit
              ? `Follow ${suitName(G.calledSuit)} if you can, or play a Joker.`
              : "Play a card."
          : `Waiting for ${nameOf(G.toAct)}…`;

  return (
    <div className="jokeri">
      {/* ---------------- left scoresheet "paper" (traditional grid) ---------------- */}
      <ScoreGrid G={G} me={me} ended={!!state.ended} roundLabel={roundLabel} teamColor={teamColor} nameOf={nameOf} />

      {/* ---------------- the table: four seats facing each other ---------------- */}
      <div className="jk-table">
        <div className="jk-felt-grid">
          {(["north", "west", "east", "south"] as const).map((dir) => (
            <TableSeat
              key={dir}
              dir={dir}
              p={seatOf(dir)}
              me={me}
              G={G}
              acting={(() => { const p = seatOf(dir); return !!p && p === G.toAct && !state.ended; })()}
              teamColor={teamColor}
              nameOf={nameOf}
            />
          ))}

          {/* the felt: each player's played card lands in front of their seat and
              the four converge in the middle as the trick fills. */}
          <div className="jk-felt">
            {(["north", "east", "south", "west"] as const).map((dir) => {
              const t = G.trick.find((tc) => compassOf(tc.player) === dir);
              return (
                <div key={dir} className={`jk-play ${dir} ${t ? "on" : ""}`}>
                  {t && <PlayCard c={t.card} mode={t.jokerMode} size={80} />}
                </div>
              );
            })}
            {G.trick.length === 0 && (
              <div className="jk-felt-empty">
                {G.phase === "play"
                  ? `${G.leader === me ? "You lead" : `${nameOf(G.leader)} leads`}`
                  : G.phase === "bid"
                    ? "bidding"
                    : G.phase === "trump"
                      ? "choosing trump"
                      : "—"}
              </div>
            )}
            {G.calledSuit && G.phase === "play" && (
              <div className="jk-called">
                led <SuitGlyph s={G.calledSuit} size={18} />
              </div>
            )}

            {/* the previous (completed) trick, always reviewable during the hand */}
            {G.lastTrick?.length > 0 && (
              <div className="jk-lasttrick">
                <span className="jk-lt-lbl">
                  last trick · {G.lastTrickWinner === me ? "you won" : `${nameOf(G.lastTrickWinner ?? "")} won`}
                </span>
                <div className="jk-lt-cards">
                  {G.lastTrick.map((t, i) => (
                    <div
                      key={i}
                      className={`jk-lt-card ${t.player === G.lastTrickWinner ? "won" : ""}`}
                      title={t.player === me ? "You" : nameOf(t.player)}
                    >
                      {isJoker(t.card) ? <Card joker size={32} /> : <Card r={t.card.r} s={t.card.s} size={32} />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* contextual action panels */}
        {state.yourTurn && G.phase === "trump" && (
          <div className="jk-panel">
            <span className="jk-panel-lbl">Choose trump</span>
            <div className="jk-suit-row">
              {SUITS.map((s) => (
                <button key={s} className="jk-suit-btn" onClick={() => onMove("chooseTrump", { trump: s })} aria-label={suitName(s)}>
                  <SuitGlyph s={s} size={30} />
                </button>
              ))}
              <button className="jk-nt-btn" onClick={() => onMove("chooseTrump", { trump: null })}>No trump</button>
            </div>
          </div>
        )}

        {state.yourTurn && G.phase === "bid" && (
          <div className="jk-panel">
            <span className="jk-panel-lbl">Your bid</span>
            <div className="jk-bid-row">
              {Array.from({ length: G.handSize + 1 }, (_, b) => (
                <button
                  key={b}
                  className={`jk-bid-btn ${b === 0 ? "pass" : ""}`}
                  onClick={() => onMove("bid", { bid: b })}
                >
                  {b === 0 ? "Pass" : b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* your hand, with a badge showing what you bid ("said") + tricks so far */}
        <div className="jk-hand-area">
          {G.bids[me] != null && (
            <div className="jk-mybid" title="how many tricks you called (– = pass)">
              <span className="jk-mybid-lbl">you said</span>
              <span className={`jk-mybid-val ${G.bids[me] === 0 ? "pass" : ""}`}>{G.bids[me] === 0 ? "–" : G.bids[me]}</span>
              {G.phase === "play" && <span className="jk-mybid-took">took {G.taken[me] ?? 0}</span>}
            </div>
          )}
          <div className="jk-hand">
          {G.hand.length === 0 ? (
            <span className="hint">No cards this deal.</span>
          ) : (
            G.hand.map((c, i) => {
              const k = key(c);
              const canPlay = state.yourTurn && G.phase === "play" && playableKeys.has(k);
              const n = G.hand.length;
              const rot = (i - (n - 1) / 2) * Math.min(5, 46 / Math.max(n, 1));
              return (
                <div
                  key={k + i}
                  className={`jk-slot ${canPlay ? "playable" : ""} ${state.yourTurn && G.phase === "play" && !canPlay ? "dim" : ""}`}
                  style={{ ["--rot" as string]: `${rot}deg`, zIndex: i, marginLeft: i ? -34 : 0 }}
                  onClick={() => clickCard(c)}
                >
                  <div className={`jk-lift ${playing === k ? "playing" : ""}`}>
                    <PlayCard c={c} size={100} />
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        <p className="hint jk-hint">{hint}</p>
      </div>

      {/* Joker high/low (+ suit call) picker */}
      {picker && (
        <div className="jk-picker-backdrop" onClick={() => setPicker(null)}>
          <div className="jk-picker" onClick={(e) => e.stopPropagation()}>
            <div className="jk-picker-title">Play the Joker</div>
            <p className="hint">
              High wins the trick; Low ducks it{isLead ? ". Leading a Joker calls a suit everyone must follow." : "."}
            </p>
            {isLead ? (
              <div className="jk-picker-lead">
                {(["high", "low"] as const).map((mode) => (
                  <div key={mode} className="jk-picker-mode">
                    <span className="jk-picker-mode-lbl">{mode === "high" ? "High — call" : "Low — call"}</span>
                    <div className="jk-suit-row">
                      {SUITS.map((s) => (
                        <button key={s} className="jk-suit-btn" onClick={() => playJoker(mode, s)} aria-label={`${mode} call ${suitName(s)}`}>
                          <SuitGlyph s={s} size={26} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="jk-picker-modes">
                <button className="jk-mode-hi" onClick={() => playJoker("high")}>Play High ↑</button>
                <button className="jk-mode-lo" onClick={() => playJoker("low")}>Play Low ↓</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- pieces --------------------------------- */

// A card that renders the two black sixes as the dedicated JOKER face,
// optionally tagged high/low when it's on the table.
function PlayCard({ c, size = 92, mode }: { c: JCard; size?: number; mode?: "high" | "low" }) {
  const joker = isJoker(c);
  return (
    <div className="jk-card" style={{ position: "relative" }}>
      {joker ? <Card joker size={size} /> : <Card r={c.r} s={c.s} size={size} />}
      {mode && <span className={`jk-mode-tag ${mode}`}>{mode === "high" ? "▲" : "▼"}</span>}
    </div>
  );
}

// One player's place at the table: name, team colour, bid/took, dealer badge,
// an acting pulse, and (for opponents) their face-down hand. My own seat is the
// compact marker at the bottom — my real hand fans out below the table.
function TableSeat({
  G,
  p,
  me,
  dir,
  acting,
  teamColor,
  nameOf,
}: {
  G: JokeriView;
  p: string | undefined;
  me: string;
  dir: "north" | "west" | "east" | "south";
  acting: boolean;
  teamColor: (p: string) => string;
  nameOf: (id: string) => string;
}) {
  if (!p) return <div className={`jk-seat ${dir} empty`} />;
  const isMe = p === me;
  const tc = teamColor(p);
  return (
    <div className={`jk-seat ${dir} ${isMe ? "me" : ""} ${acting ? "acting" : ""}`}>
      {!isMe && <MiniFan n={G.handCounts[p] ?? 0} />}
      <div className="jk-seat-plate">
        <div className="jk-seat-head">
          {tc && <span className="jk-team-dot" style={{ background: tc }} />}
          <span className="jk-seat-name">{isMe ? "You" : nameOf(p)}</span>
          {p === G.dealer && <span className="jk-badge" title="dealer">D</span>}
          {acting && <span className="jk-turn-dot" />}
        </div>
        <div className="jk-seat-sub">{fmtBid(G.bids[p])} · took {G.taken[p] ?? 0}</div>
      </div>
    </div>
  );
}

function MiniFan({ n }: { n: number }) {
  const shown = Math.max(0, Math.min(n, 5));
  return (
    <div className="jk-minifan">
      {Array.from({ length: Math.max(1, shown) }, (_, i) => (
        <div className="jk-minicard" style={{ ["--i" as string]: i }} key={i}>
          <Card back size={40} />
        </div>
      ))}
      <span className="jk-minicount">{n}</span>
    </div>
  );
}

/* ------------------------- the traditional scoresheet ------------------------
 * Written the way the paper is: every deal is a row, the leading column is the
 * deal size, and each player's cell reads "bid │ points" — a dash for a 0 bid
 * (pass), and a struck box for a khisht (bid ≥1 but took none). After each of
 * the four rounds a band shows the running total ÷100 with a comma, exactly like
 * the folk sheet ("1,9" = 190, "−1,5" = −150). The last row is the current deal,
 * live: bids as they come in and the tricks taken so far.
 * ---------------------------------------------------------------------------- */

// A khisht is a failed positive bid (called ≥1, took 0) — drawn as a box, never
// a number.
function isKhisht(bid: number, taken: number): boolean {
  return bid >= 1 && taken === 0;
}

// The folk running-total notation: points ÷ 100 with a comma decimal. All point
// values are multiples of ten, so one decimal is exact (700→"7,0", −150→"−1,5").
function fmtTotal(n: number): string {
  return (n / 100).toFixed(1).replace(".", ",").replace("-", "−");
}

// Does a round (and thus a subtotal band) end after this deal?
function roundEndsAfter(handIndex: number, handCount: number): boolean {
  if (handIndex + 1 >= handCount) return false; // the very end gets the footer, not a band
  return roundOf(handIndex).round !== roundOf(handIndex + 1).round;
}

function ScoreGrid({
  G,
  me,
  ended,
  roundLabel,
  teamColor,
  nameOf,
}: {
  G: JokeriView;
  me: string;
  ended: boolean;
  roundLabel: string;
  teamColor: (p: string) => string;
  nameOf: (id: string) => string;
}) {
  const results = G.handResults ?? [];
  const running: Record<string, number> = Object.fromEntries(G.players.map((p) => [p, 0]));

  // Keep the newest deal (the live row) in view as the sheet fills up.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [results.length, G.handIndex]);

  // Build the body: each scored deal, a subtotal band at every round break, and
  // finally the live current deal.
  const rows: ReactNode[] = [];
  for (const hr of results) {
    for (const p of G.players) running[p] = (running[p] ?? 0) + (hr.delta[p] ?? 0);
    rows.push(
      <tr key={`h${hr.handIndex}`} className="jk-g-row">
        <td className="jk-g-deal">{hr.handSize}</td>
        {G.players.map((p) => (
          <ScoreCell key={p} bid={hr.bids[p] ?? 0} pts={hr.delta[p] ?? 0} taken={hr.taken[p] ?? 0} />
        ))}
      </tr>,
    );
    if (roundEndsAfter(hr.handIndex, G.handCount)) {
      const snapshot = { ...running };
      rows.push(
        <tr key={`b${hr.handIndex}`} className="jk-g-band">
          <td className="jk-g-deal" aria-hidden />
          {G.players.map((p) => (
            <td key={p} className="jk-g-total">
              {fmtTotal(snapshot[p] ?? 0)}
            </td>
          ))}
        </tr>,
      );
    }
  }

  // The live, in-progress deal — shown until the match is done.
  const played = results.some((r) => r.handIndex === G.handIndex);
  if (!ended && G.phase !== "done" && !played) {
    rows.push(
      <tr key="live" className="jk-g-row live">
        <td className="jk-g-deal">{G.handSize || "·"}</td>
        {G.players.map((p) => (
          <td key={p} className={`jk-g-cell ${p === G.toAct ? "acting" : ""}`}>
            <span className="jk-cellbox">
              <span className="jk-bidnum">{fmtLiveBid(G.bids[p])}</span>
              <span className="jk-pts live">·{G.taken[p] ?? 0}</span>
            </span>
          </td>
        ))}
      </tr>,
    );
  }

  return (
    <aside className="jk-paper">
      <div className="jk-paper-head">
        <span className="jk-paper-title">Scoresheet</span>
        <span className="jk-round">{roundLabel}</span>
      </div>
      <div className="jk-trump">
        <span className="jk-trump-lbl">trump</span>
        {G.trump ? <SuitGlyph s={G.trump} size={22} /> : <span className="jk-notrump">NT</span>}
        {G.handSize > 0 && <span className="jk-handsize">{G.handSize}-card deal</span>}
      </div>

      <div className="jk-grid-scroll" ref={scrollRef}>
        <table className="jk-grid">
          <thead>
            <tr>
              <th className="jk-g-deal" title="cards dealt">#</th>
              {G.players.map((p) => {
                const tc = teamColor(p);
                const acting = p === G.toAct && !ended;
                return (
                  <th key={p} className={`jk-g-name ${p === me ? "you" : ""}`}>
                    {tc && <span className="jk-team-dot" style={{ background: tc }} />}
                    <span className="jk-g-nick">{p === me ? "You" : nameOf(p)}</span>
                    {p === G.dealer && <span className="jk-badge" title="dealer">D</span>}
                    {acting && <span className="jk-turn-dot" />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>

      {/* standings footer — always-visible running totals (and team sums) ÷100 */}
      <div className="jk-standings">
        <div className="jk-stand-row heads" style={{ ["--cols" as string]: G.players.length }}>
          <span className="jk-stand-lbl">now</span>
          {G.players.map((p) => (
            <span key={p} className="jk-stand-tot">
              {fmtTotal(G.scores[p] ?? 0)}
            </span>
          ))}
        </div>
        {G.mode === "teams" && (
          <div className="jk-teamtotals">
            {G.teams.map((team, i) => {
              const total = team.reduce((s, p) => s + (G.scores[p] ?? 0), 0);
              return (
                <div key={i} className="jk-teamtotal">
                  <span className="jk-team-dot" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                  <span className="jk-team-name">Team {String.fromCharCode(65 + i)}</span>
                  <span className="jk-team-sum">{fmtTotal(total)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

// One scored cell: "bid │ points", with a struck box in place of the number for
// a khisht.
function ScoreCell({ bid, pts, taken }: { bid: number; pts: number; taken: number }) {
  const khisht = isKhisht(bid, taken);
  return (
    <td className="jk-g-cell">
      <span className="jk-cellbox">
        <span className="jk-bidnum">{bid === 0 ? "–" : bid}</span>
        {khisht ? (
          <span className="jk-khisht" title={`khisht ${pts}`}>
            ‒‒
          </span>
        ) : (
          <span className="jk-pts">{pts}</span>
        )}
      </span>
    </td>
  );
}

function fmtLiveBid(b: number | null | undefined): string {
  if (b == null) return "·"; // not yet bid
  return b === 0 ? "–" : String(b);
}

function fmtBid(b: number | null | undefined): string {
  if (b == null) return "no bid";
  return b === 0 ? "passed" : `bid ${b}`;
}
function suitName(s: string): string {
  return { S: "spades", H: "hearts", D: "diamonds", C: "clubs" }[s] ?? s;
}
