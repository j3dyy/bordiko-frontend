import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Card, SuitGlyph } from "./CardArt.tsx";
import { TEAM_COLORS } from "./TableSetup.tsx";
import { soundCardPlay, soundTrickWon } from "./sound.ts";
import type { StateMsg } from "./wire.ts";
import { useT } from "./i18n.tsx";

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
  /** Deal schedule chosen at the table. Optional: an older published wasm may
   *  not emit it, in which case the sheet falls back to the standard piles. */
  format?: "standard" | "nines";
  handIndex: number;
  handCount: number;
  handSize: number;
  dealer: string;
  trump: string | null;
  trumpCard: JCard | null;
  firstActor: string;
  toAct: string;
  forbiddenBid?: number; // savaldebulo: the bid the current bidder may not make (-1 if none)
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

// Hand sort: group by suit (alternating colours) then low→high; Jokers last.
const SUIT_ORD: Record<string, number> = { S: 0, H: 1, C: 2, D: 3 };
const RANK_ORD: Record<string, number> = { "6": 0, "7": 1, "8": 2, "9": 3, "10": 4, J: 5, Q: 6, K: 7, A: 8 };
function sortHand(hand: JCard[]): JCard[] {
  return [...hand].sort((a, b) => {
    const aj = isJoker(a), bj = isJoker(b);
    if (aj !== bj) return aj ? 1 : -1; // jokers to the right
    if (aj && bj) return a.s === "S" ? -1 : 1;
    return SUIT_ORD[a.s] - SUIT_ORD[b.s] || RANK_ORD[a.r] - RANK_ORD[b.r];
  });
}

// player ids are like "dev:alice" or an OAuth id — show a friendly-ish label.
function shortName(id: string): string {
  const base = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
  return base.length <= 12 ? base.charAt(0).toUpperCase() + base.slice(1) : base.slice(0, 6) + "…";
}

/* ------------------------------- the four piles -------------------------------
 * The paper is drawn as separate piles side by side, each with its own running
 * total underneath — not one long column. A pile is one block of the deal
 * schedule, so this mirrors the game's buildSchedule():
 *
 *   standard: 1–8 | 9,9,9,9 | 8–1 | 9,9,9,9   (24 deals, four piles)
 *   nines:    9,9,9,9 | 9,9,9,9               (8 deals, two piles)
 *
 * The view exposes `format` and `handCount` but not the schedule array, so the
 * sizes are derived here. Keep in step with games/jokeri/src/game.ts.
 * ---------------------------------------------------------------------------- */
interface Pile {
  /** Index of this pile's first deal in the whole schedule. */
  start: number;
  /** Cards dealt for each deal in the pile. */
  sizes: number[];
}

function pilesOf(format: string | undefined): Pile[] {
  if (format === "nines") {
    return [
      { start: 0, sizes: [9, 9, 9, 9] },
      { start: 4, sizes: [9, 9, 9, 9] },
    ];
  }
  return [
    { start: 0, sizes: [1, 2, 3, 4, 5, 6, 7, 8] },
    { start: 8, sizes: [9, 9, 9, 9] },
    { start: 12, sizes: [8, 7, 6, 5, 4, 3, 2, 1] },
    { start: 20, sizes: [9, 9, 9, 9] },
  ];
}

/** Column heading inside a pile — a couple of letters is all that fits, and all
 *  a player needs to find their column. Full names live in the standings. */
function initialOf(name: string): string {
  return name.trim().slice(0, 3);
}

/** A pile's heading: "1–8" for a run, "9 × 4" for a block of nines. */
function pileLabel(p: Pile): string {
  const first = p.sizes[0];
  const last = p.sizes[p.sizes.length - 1];
  if (first === last) return `${first} × ${p.sizes.length}`;
  return `${first}–${last}`;
}

/** Which pile a deal falls in, and where it sits inside it. */
function roundOf(handIndex: number, format?: string): { round: number; deal: number; total: number } {
  const piles = pilesOf(format);
  for (let i = 0; i < piles.length; i++) {
    const p = piles[i];
    if (handIndex < p.start + p.sizes.length) {
      return { round: i + 1, deal: handIndex - p.start + 1, total: p.sizes.length };
    }
  }
  const last = piles[piles.length - 1];
  return { round: piles.length, deal: last.sizes.length, total: last.sizes.length };
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
  const { t } = useT();
  const G = state.G as JokeriView;
  const [picker, setPicker] = useState<JCard | null>(null); // a Joker awaiting high/low (+ suit)
  const [playing, setPlaying] = useState<string | null>(null);
  const [collect, setCollect] = useState<{ cards: TrickCard[]; dir: string; k: number } | null>(null);
  const collectRef = useRef<{ winner: string | null; k: number }>({ winner: null, k: 0 });

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

  // Bids vs. tricks: total called so far, and the gap to the hand size. Once all
  // have bid, gap<0 = წაგლეჯვა (over-called), gap>0 = შეტენვა (under-called).
  const bidTotal = G.players.reduce((s, p) => s + (G.bids[p] ?? 0), 0);
  const allBid = G.players.every((p) => G.bids[p] != null);
  const bidGap = G.handSize - bidTotal;

  // When a trick is taken, sweep its cards toward the winner's side of the table.
  useEffect(() => {
    const w = G.lastTrickWinner ?? null;
    if (w && w !== collectRef.current.winner && G.lastTrick.length > 0) {
      const k = ++collectRef.current.k;
      collectRef.current.winner = w;
      setCollect({ cards: G.lastTrick, dir: compassOf(w), k });
      const t = setTimeout(() => setCollect((c) => (c && c.k === k ? null : c)), 1500);
      return () => clearTimeout(t);
    }
    if (!w) collectRef.current.winner = null;
  }, [G.lastTrickWinner, state.moveCount]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const rnd = roundOf(G.handIndex, G.format);
  const roundLabel = t("jk.round", { r: rnd.round, n: rnd.deal, total: rnd.total });
  const trumpLabel = G.trump ? null : t("jk.noTrump");

  // Between tricks (the live trick is empty and the sweep has finished) the just-
  // completed trick RESTS in place on the felt — dimmed, the winner ringed — so
  // everyone can still see what was played until the next card is led.
  const restingLast = G.trick.length === 0 && !collect && (G.lastTrick?.length ?? 0) > 0;
  const feltCards: TrickCard[] = G.trick.length > 0 ? G.trick : restingLast ? G.lastTrick : [];

  const hint = state.ended
    ? t("jk.matchOver")
    : G.phase === "trump"
      ? state.yourTurn
        ? t("jk.chooseTrump")
        : t("jk.choosingTrump", { name: nameOf(G.toAct) })
      : G.phase === "bid"
        ? state.yourTurn
          ? t("jk.declareBid")
          : t("jk.bidding", { name: nameOf(G.toAct) })
        : state.yourTurn
          ? isLead
            ? t("jk.yourLeadPlay")
            : G.calledSuit
              ? t("jk.followSuit", { suit: t(`suit.${G.calledSuit}`) })
              : t("jk.playCard")
          : t("jk.waitingFor", { name: nameOf(G.toAct) });

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
            {/* koziri (trump) for the deal, shown on the table */}
            {G.phase !== "trump" && G.handSize > 0 && (
              <div className={`jk-koziri ${G.trump ? "" : "nt"}`}>
                <span className="jk-koziri-lbl">{t("jk.koziri")}</span>
                {G.trump ? (
                  <div className="jk-koziri-card">
                    <Card r={G.trumpCard?.r ?? "A"} s={G.trump} size={66} />
                  </div>
                ) : (
                  <span className="jk-koziri-nt">{t("jk.noTrump")}</span>
                )}
              </div>
            )}

            {/* bids vs. tricks: fill gap during bidding, then წაგლეჯვა / შეტენვა */}
            {(G.phase === "bid" || G.phase === "play") && G.handSize > 0 && (
              <div className={`jk-bidsum ${allBid ? (bidGap < 0 ? "over" : bidGap > 0 ? "under" : "") : ""}`}>
                {allBid ? (
                  bidGap < 0 ? (
                    <><b>წაგლეჯვა</b> +{Math.abs(bidGap)}</>
                  ) : bidGap > 0 ? (
                    <><b>შეტენვა</b> −{bidGap}</>
                  ) : (
                    <b>{t("jk.full")}</b>
                  )
                ) : (
                  <>
                    {t("jk.said")} <b>{bidTotal}</b>/{G.handSize}
                    {bidGap > 0 && <span className="jk-fill"> · {t("jk.fill", { gap: bidGap })}</span>}
                  </>
                )}
              </div>
            )}

            {(["north", "east", "south", "west"] as const).map((dir) => {
              const t = feltCards.find((tc) => compassOf(tc.player) === dir);
              const won = restingLast && !!t && t.player === G.lastTrickWinner;
              return (
                <div key={dir} className={`jk-play ${dir} ${t ? "on" : ""} ${restingLast ? "resting" : ""} ${won ? "won" : ""}`}>
                  {t && <PlayCard c={t.card} mode={t.jokerMode} size={80} />}
                </div>
              );
            })}

            {/* the completed trick holds in place (so you see the last card), then
                sweeps toward the winner's side */}
            {collect && (
              <div key={collect.k} className={`jk-collect to-${collect.dir}`}>
                {collect.cards.map((t, i) => (
                  <div key={i} className={`jk-collect-card at-${compassOf(t.player)}`} style={{ zIndex: i }}>
                    <PlayCard c={t.card} mode={t.jokerMode} size={80} />
                  </div>
                ))}
              </div>
            )}

            {G.trick.length === 0 && !collect && !restingLast && (
              <div className="jk-felt-empty">
                {G.phase === "play"
                  ? G.leader === me
                    ? t("jk.youLead")
                    : t("jk.leads", { name: nameOf(G.leader) })
                  : G.phase === "bid"
                    ? t("jk.biddingShort")
                    : G.phase === "trump"
                      ? t("jk.choosingTrumpShort")
                      : "—"}
              </div>
            )}
            {/* whose lead it is now, shown under the resting trick */}
            {restingLast && G.phase === "play" && (
              <div className="jk-felt-lead">{G.leader === me ? t("jk.yourLead") : t("jk.leads", { name: nameOf(G.leader) })}</div>
            )}
            {G.calledSuit && G.phase === "play" && (() => {
              const lead = G.trick.find((t) => t.player === G.leader);
              const jokerLed = lead && isJoker(lead.card);
              return (
                <div className={`jk-called ${jokerLed ? "joker" : ""}`}>
                  {jokerLed ? (
                    <>🃏 {lead.jokerMode === "high" ? t("jk.high") : t("jk.low")} · {t("jk.calls")} <SuitGlyph s={G.calledSuit} size={18} /></>
                  ) : (
                    <>{t("jk.led")} <SuitGlyph s={G.calledSuit} size={18} /></>
                  )}
                </div>
              );
            })()}

            {/* a compact review of the previous trick — shown only while a NEW
                trick is in progress; between tricks the full trick rests on the
                felt (above) instead, so this doesn't duplicate it. */}
            {G.lastTrick?.length > 0 && G.trick.length > 0 && (
              <div className="jk-lasttrick">
                <span className="jk-lt-lbl">
                  {G.lastTrickWinner === me ? t("jk.lastTrickYouWon") : t("jk.lastTrickWon", { name: nameOf(G.lastTrickWinner ?? "") })}
                </span>
                <div className="jk-lt-cards">
                  {G.lastTrick.map((tc, i) => (
                    <div
                      key={i}
                      className={`jk-lt-card ${tc.player === G.lastTrickWinner ? "won" : ""}`}
                      title={tc.player === me ? t("common.you") : nameOf(tc.player)}
                    >
                      {isJoker(tc.card) ? <Card joker size={46} /> : <Card r={tc.card.r} s={tc.card.s} size={46} />}
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
            <span className="jk-panel-lbl">{t("jk.chooseTrumpBtn")}</span>
            <div className="jk-suit-row">
              {SUITS.map((s) => (
                <button key={s} className="jk-suit-btn" onClick={() => onMove("chooseTrump", { trump: s })} aria-label={t(`suit.${s}`)}>
                  <SuitGlyph s={s} size={30} />
                </button>
              ))}
              <button className="jk-nt-btn" onClick={() => onMove("chooseTrump", { trump: null })}>{t("jk.noTrumpShort")}</button>
            </div>
          </div>
        )}

        {state.yourTurn && G.phase === "bid" && (
          <div className="jk-panel">
            <span className="jk-panel-lbl">
              {t("jk.yourBid")}
              {G.forbiddenBid != null && G.forbiddenBid >= 0 && (
                <span className="jk-savaldebulo" title={t("jk.savaldebulo")}>
                  {t("jk.cantSay", { n: G.forbiddenBid })}
                </span>
              )}
            </span>
            <div className="jk-bid-row">
              {Array.from({ length: G.handSize + 1 }, (_, b) => {
                const forbidden = b === G.forbiddenBid;
                return (
                  <button
                    key={b}
                    className={`jk-bid-btn ${b === 0 ? "pass" : ""} ${forbidden ? "forbidden" : ""}`}
                    disabled={forbidden}
                    title={forbidden ? t("jk.savaldebulo") : undefined}
                    onClick={() => onMove("bid", { bid: b })}
                  >
                    {b === 0 ? t("jk.pass") : b}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* your hand, with a badge showing what you bid ("said") + tricks so far */}
        <div className="jk-hand-area">
          {G.bids[me] != null && (
            <div className="jk-mybid" title="how many tricks you called (– = pass)">
              <span className="jk-mybid-lbl">{t("jk.youSaid")}</span>
              <span className={`jk-mybid-val ${G.bids[me] === 0 ? "pass" : ""}`}>{G.bids[me] === 0 ? "–" : G.bids[me]}</span>
              {G.phase === "play" && <span className="jk-mybid-took">{t("jk.took", { n: G.taken[me] ?? 0 })}</span>}
            </div>
          )}
          <div className="jk-hand">
          {G.hand.length === 0 ? (
            <span className="hint">{t("jk.noCards")}</span>
          ) : (
            sortHand(G.hand).map((c, i, arr) => {
              const k = key(c);
              const canPlay = state.yourTurn && G.phase === "play" && playableKeys.has(k);
              const n = arr.length;
              const rot = (i - (n - 1) / 2) * Math.min(5, 46 / Math.max(n, 1));
              return (
                <div
                  key={k}
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
            <div className="jk-picker-title">{t("jk.playJoker")}</div>
            <p className="hint">
              {t("jk.jokerHelp", { lead: isLead ? t("jk.jokerHelpLead") : "" })}
            </p>
            {isLead ? (
              <div className="jk-picker-lead">
                {(["high", "low"] as const).map((mode) => (
                  <div key={mode} className="jk-picker-mode">
                    <span className="jk-picker-mode-lbl">{mode === "high" ? t("jk.highCall") : t("jk.lowCall")}</span>
                    <div className="jk-suit-row">
                      {SUITS.map((s) => (
                        <button key={s} className="jk-suit-btn" onClick={() => playJoker(mode, s)} aria-label={`${t(mode === "high" ? "jk.high" : "jk.low")} ${t(`suit.${s}`)}`}>
                          <SuitGlyph s={s} size={26} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="jk-picker-modes">
                <button className="jk-mode-hi" onClick={() => playJoker("high")}>{t("jk.playHigh")}</button>
                <button className="jk-mode-lo" onClick={() => playJoker("low")}>{t("jk.playLow")}</button>
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
  const { t } = useT();
  const joker = isJoker(c);
  return (
    <div className="jk-card" style={{ position: "relative" }}>
      {joker ? <Card joker size={size} /> : <Card r={c.r} s={c.s} size={size} />}
      {mode && <span className={`jk-mode-tag ${mode}`}>{mode === "high" ? t("jk.highBtn") : t("jk.lowBtn")}</span>}
    </div>
  );
}

// One player's place at the table: name, team colour, bid/took, dealer badge,
// an acting pulse, and (for opponents) their face-down hand. My own seat is the
// compact marker at the bottom — my real hand fans out below the table.
// A compact "bid / took" scoreboard for a seat — the take cell turns green when
// it matches the call, amber when it's overshot.
function Tally({ bid, took, phase }: { bid: number | null; took: number; phase: "trump" | "bid" | "play" | "done" }) {
  const { t } = useT();
  const bidLabel = bid == null ? "—" : bid === 0 ? "pas" : String(bid);
  const made = bid != null && bid >= 1 && took === bid;
  const over = bid != null && ((bid >= 1 && took > bid) || (bid === 0 && took > 0));
  const showTook = phase === "play" || phase === "done" || took > 0;
  return (
    <div className="jk-tally">
      <span className="jk-tally-cell">
        <b className={bid === 0 ? "pas" : ""}>{bidLabel}</b>
        <i>{t("jk.bid")}</i>
      </span>
      {showTook && (
        <span className={`jk-tally-cell took ${made ? "made" : ""} ${over ? "over" : ""}`}>
          <b>{took}</b>
          <i>{t("jk.tookLbl")}</i>
        </span>
      )}
    </div>
  );
}

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
  const { t } = useT();
  if (!p) return <div className={`jk-seat ${dir} empty`} />;
  const isMe = p === me;
  const tc = teamColor(p);
  return (
    <div className={`jk-seat ${dir} ${isMe ? "me" : ""} ${acting ? "acting" : ""}`}>
      {!isMe && <MiniFan n={G.handCounts[p] ?? 0} />}
      <div className="jk-seat-plate">
        <div className="jk-seat-head">
          {tc && <span className="jk-team-dot" style={{ background: tc }} />}
          <span className="jk-seat-name">{isMe ? t("common.you") : nameOf(p)}</span>
          {p === G.dealer && <span className="jk-badge" title="dealer">{t("jk.dealer")}</span>}
          {acting && <span className="jk-turn-dot" />}
        </div>
        <Tally bid={G.bids[p] ?? null} took={G.taken[p] ?? 0} phase={G.phase} />
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

/**
 * Walk the schedule in order and hand back, per pile, the row for every deal it
 * holds plus the pile's closing total. Totals are cumulative across the whole
 * sheet (pile 2 carries pile 1 forward), and a pile only shows its total once
 * every deal in it has been scored — the way you only rule off a block on paper
 * when it is finished.
 */
function buildPiles(G: JokeriView, ended: boolean): Array<{
  pile: Pile;
  deals: Array<{ handIndex: number; size: number; result?: JHandResult; live: boolean }>;
  total: Record<string, number> | null;
}> {
  const byIndex = new Map((G.handResults ?? []).map((r) => [r.handIndex, r]));
  const running: Record<string, number> = Object.fromEntries(G.players.map((p) => [p, 0]));
  const liveIndex = !ended && G.phase !== "done" && !byIndex.has(G.handIndex) ? G.handIndex : -1;

  return pilesOf(G.format).map((pile) => {
    const deals = pile.sizes.map((size, i) => {
      const handIndex = pile.start + i;
      const result = byIndex.get(handIndex);
      if (result) for (const p of G.players) running[p] = (running[p] ?? 0) + (result.delta[p] ?? 0);
      return { handIndex, size, result, live: handIndex === liveIndex };
    });
    const complete = deals.every((d) => d.result);
    return { pile, deals, total: complete ? { ...running } : null };
  });
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
  const { t } = useT();
  const piles = buildPiles(G, ended);

  return (
    <aside className="jk-paper">
      <div className="jk-paper-head">
        <span className="jk-paper-title">{t("jk.scoresheet")}</span>
        <span className="jk-round">{roundLabel}</span>
        {/* Trump and the bid tally ride on the title line: stacked, they cost the
            felt ~70px of height it needs more than the sheet does. */}
        <span className="jk-trump">
          <span className="jk-trump-lbl">{t("jk.trump")}</span>
          {G.trump ? <SuitGlyph s={G.trump} size={18} /> : <span className="jk-notrump">NT</span>}
          {G.handSize > 0 && <span className="jk-handsize">{t("jk.cardDeal", { n: G.handSize })}</span>}
        </span>
        {G.handSize > 0 && G.phase !== "trump" && (() => {
          const bt = G.players.reduce((s, p) => s + (G.bids[p] ?? 0), 0);
          const ab = G.players.every((p) => G.bids[p] != null);
          const gap = G.handSize - bt;
          return (
            <span className={`jk-sheet-bids ${ab ? (gap < 0 ? "over" : gap > 0 ? "under" : "") : ""}`}>
              <span>{t("jk.bids", { a: bt, b: G.handSize })}</span>
              {ab ? (
                gap < 0 ? <b>წაგლეჯვა +{Math.abs(gap)}</b> : gap > 0 ? <b>შეტენვა −{gap}</b> : <b>{t("jk.full")}</b>
              ) : (
                gap > 0 && <b className="jk-fill">{t("jk.fill", { gap })}</b>
              )}
            </span>
          );
        })()}
      </div>

      {/* The piles, side by side — each block of the schedule ruled off with its
          own running total, the way the sheet is laid out on the table. */}
      <div className="jk-piles" style={{ ["--piles" as string]: piles.length }}>
        {piles.map(({ pile, deals, total }, pi) => (
          <div key={pi} className={`jk-pile ${deals.some((d) => d.live) ? "current" : ""}`}>
            <div className="jk-pile-head">{pileLabel(pile)}</div>
            <table className="jk-grid">
              <thead>
                <tr>
                  <th className="jk-g-deal" title="cards dealt">#</th>
                  {/* Initials only: the columns repeat in every pile, so the full
                      names — and who deals / who acts — are tracked once, in the
                      standings below. Four names per pile neither fits nor helps. */}
                  {G.players.map((p) => {
                    const tc = teamColor(p);
                    return (
                      <th key={p} className={`jk-g-name ${p === me ? "you" : ""}`} title={nameOf(p)}>
                        {tc && <span className="jk-team-dot" style={{ background: tc }} />}
                        <span className="jk-g-nick">{initialOf(nameOf(p))}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {deals.map(({ handIndex, size, result, live }) => {
                  if (result) {
                    return (
                      <tr key={handIndex} className="jk-g-row">
                        <td className="jk-g-deal">{result.handSize}</td>
                        {G.players.map((p) => (
                          <ScoreCell key={p} bid={result.bids[p] ?? 0} pts={result.delta[p] ?? 0} taken={result.taken[p] ?? 0} />
                        ))}
                      </tr>
                    );
                  }
                  if (live) {
                    return (
                      <tr key={handIndex} className="jk-g-row live">
                        <td className="jk-g-deal">{G.handSize || size}</td>
                        {G.players.map((p) => (
                          <td key={p} className={`jk-g-cell ${p === G.toAct ? "acting" : ""}`}>
                            <span className="jk-cellbox">
                              <span className="jk-bidnum">{fmtLiveBid(G.bids[p])}</span>
                              <span className="jk-pts live">·{G.taken[p] ?? 0}</span>
                            </span>
                          </td>
                        ))}
                      </tr>
                    );
                  }
                  // Not dealt yet: the deal size is already ruled on the paper.
                  return (
                    <tr key={handIndex} className="jk-g-row future">
                      <td className="jk-g-deal">{size}</td>
                      {G.players.map((p) => (
                        <td key={p} className="jk-g-cell" />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="jk-g-band">
                  <td className="jk-g-deal" aria-hidden />
                  {G.players.map((p) => (
                    <td key={p} className="jk-g-total">
                      {total ? fmtTotal(total[p] ?? 0) : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        ))}
      </div>

      {/* Standings — the sheet's legend as well as its totals: this is the one
          place the full names, the dealer and whose turn it is are written, so
          the piles above can stay initials. */}
      <div className="jk-standings">
        <div className="jk-stand-row heads" style={{ ["--cols" as string]: G.players.length }}>
          <span className="jk-stand-lbl">{t("jk.now")}</span>
          {G.players.map((p) => {
            const tc = teamColor(p);
            const acting = p === G.toAct && !ended;
            return (
              <span key={p} className={`jk-stand-who ${p === me ? "you" : ""} ${acting ? "acting" : ""}`}>
                {tc && <span className="jk-team-dot" style={{ background: tc }} />}
                <span className="jk-stand-name">{p === me ? t("common.you") : nameOf(p)}</span>
                {p === G.dealer && <span className="jk-badge" title="dealer">{t("jk.dealer")}</span>}
                {acting && <span className="jk-turn-dot" />}
                <b className="jk-stand-tot">{fmtTotal(G.scores[p] ?? 0)}</b>
              </span>
            );
          })}
        </div>
        {G.mode === "teams" && (
          <div className="jk-teamtotals">
            {G.teams.map((team, i) => {
              const total = team.reduce((s, p) => s + (G.scores[p] ?? 0), 0);
              return (
                <div key={i} className="jk-teamtotal">
                  <span className="jk-team-dot" style={{ background: TEAM_COLORS[i % TEAM_COLORS.length] }} />
                  <span className="jk-team-name">{i === 0 ? t("ts.teamA") : i === 1 ? t("ts.teamB") : `Team ${String.fromCharCode(65 + i)}`}</span>
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
    <td className={`jk-g-cell ${khisht ? "khisht" : ""}`}>
      <span className="jk-cellbox">
        <span className="jk-bidnum">{bid === 0 ? "–" : bid}</span>
        {khisht ? (
          // A struck box, never a number: a pile column is ~45px and the penalty
          // is the same at every table anyway — the damage shows in the total.
          // (It used to print ✕200, which clipped to a misleading "20".)
          <span className="jk-khisht" title={`khisht ${pts}`} aria-label={`khisht ${pts}`}>
            ✕
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
