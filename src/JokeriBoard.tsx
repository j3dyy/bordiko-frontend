import { useEffect, useMemo, useState } from "react";
import { Card, SuitGlyph } from "./CardArt.tsx";
import { TEAM_COLORS } from "./TableSetup.tsx";
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
  bids: Record<string, number | null>;
  taken: Record<string, number>;
  scores: Record<string, number>;
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
// "scoresheet" paper tracking every player's request (bid) and takes.
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
  const others = G.players.filter((p) => p !== me);
  const trickCardOf = (p: string) => G.trick.find((t) => t.player === p);

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
        : `${shortName(G.toAct)} is choosing the trump…`
      : G.phase === "bid"
        ? state.yourTurn
          ? "Declare how many tricks you'll take (0 to pass)."
          : `${shortName(G.toAct)} is bidding…`
        : state.yourTurn
          ? isLead
            ? "Your lead — play any card."
            : G.calledSuit
              ? `Follow ${suitName(G.calledSuit)} if you can, or play a Joker.`
              : "Play a card."
          : `Waiting for ${shortName(G.toAct)}…`;

  return (
    <div className="jokeri">
      {/* ---------------- left scoresheet "paper" ---------------- */}
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
        <table className="jk-sheet">
          <thead>
            <tr>
              <th>player</th>
              <th title="tricks requested">ask</th>
              <th title="tricks taken">take</th>
              <th>score</th>
            </tr>
          </thead>
          <tbody>
            {G.players.map((p) => {
              const bid = G.bids[p];
              const isYou = p === me;
              const acting = p === G.toAct && !state.ended;
              const tc = teamColor(p);
              return (
                <tr key={p} className={`${isYou ? "you" : ""} ${acting ? "acting" : ""}`}>
                  <td className="jk-pname">
                    {tc && <span className="jk-team-dot" style={{ background: tc }} />}
                    {isYou ? "You" : shortName(p)}
                    {p === G.dealer && <span className="jk-badge" title="dealer">D</span>}
                    {acting && <span className="jk-turn-dot" />}
                  </td>
                  <td className="jk-num">{bid == null ? "—" : bid}</td>
                  <td className="jk-num">{G.taken[p] ?? 0}</td>
                  <td className="jk-num jk-score">{G.scores[p] ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {G.mode === "teams" && <TeamTotals G={G} />}
      </aside>

      {/* ---------------- the desk ---------------- */}
      <div className="jk-table">
        <div className="jk-opponents">
          {others.map((p) => {
            const t = trickCardOf(p);
            const tc = teamColor(p);
            return (
              <div key={p} className={`jk-opp ${p === G.toAct ? "acting" : ""}`}>
                <div className="jk-opp-head">
                  {tc && <span className="jk-team-dot" style={{ background: tc }} />}
                  <span className="jk-opp-name">{shortName(p)}</span>
                  <span className="jk-opp-bid">{fmtBid(G.bids[p])} · took {G.taken[p] ?? 0}</span>
                </div>
                <div className="jk-opp-cards">
                  {t ? (
                    <div className="jk-played">
                      <PlayCard c={t.card} mode={t.jokerMode} size={78} />
                    </div>
                  ) : (
                    <MiniFan n={G.handCounts[p] ?? 0} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* center: the current trick + who leads */}
        <div className="jk-desk">
          {G.trick.length === 0 ? (
            <div className="jk-desk-empty">
              {G.phase === "play" ? `${shortName(G.leader)} leads` : "—"}
            </div>
          ) : (
            <div className="jk-trick">
              {G.trick.map((t) => (
                <div key={t.player} className="jk-trick-card">
                  <span className="jk-trick-who">{t.player === me ? "You" : shortName(t.player)}</span>
                  <PlayCard c={t.card} mode={t.jokerMode} size={92} />
                </div>
              ))}
            </div>
          )}
          {G.calledSuit && G.phase === "play" && (
            <div className="jk-called">
              led <SuitGlyph s={G.calledSuit} size={20} />
            </div>
          )}
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

        {/* your hand */}
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
                    <PlayCard c={c} size={92} />
                  </div>
                </div>
              );
            })
          )}
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

// A card that renders the two black sixes as Jokers (a 6♠/6♣ with a JOKER
// ribbon), optionally tagged high/low when it's on the table.
function PlayCard({ c, size = 92, mode }: { c: JCard; size?: number; mode?: "high" | "low" }) {
  const joker = isJoker(c);
  return (
    <div className={`jk-card ${joker ? "joker" : ""}`} style={{ position: "relative" }}>
      <Card r={c.r} s={c.s} size={size} />
      {joker && <span className="jk-joker-tag">JOKER</span>}
      {mode && <span className={`jk-mode-tag ${mode}`}>{mode === "high" ? "▲" : "▼"}</span>}
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

function TeamTotals({ G }: { G: JokeriView }) {
  return (
    <div className="jk-teamtotals">
      {G.teams.map((team, i) => {
        const total = team.reduce((s, p) => s + (G.scores[p] ?? 0), 0);
        return (
          <div key={i} className="jk-teamtotal">
            <span className="jk-team-dot" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
            <span className="jk-team-name">Team {String.fromCharCode(65 + i)}</span>
            <span className="jk-team-sum">{total}</span>
          </div>
        );
      })}
    </div>
  );
}

function fmtBid(b: number | null | undefined): string {
  if (b == null) return "no bid";
  return b === 0 ? "passed" : `bid ${b}`;
}
function suitName(s: string): string {
  return { S: "spades", H: "hearts", D: "diamonds", C: "clubs" }[s] ?? s;
}
