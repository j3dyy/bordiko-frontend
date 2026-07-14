import { useEffect, useRef, useState } from "react";
import { useMatch } from "./useMatch.ts";
import { leaveMatch } from "./api.ts";
import { isMuted, setMuted, soundEmote, soundRing } from "./sound.ts";
import { useT } from "./i18n.tsx";
import type { LiveEmote } from "./useMatch.ts";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

// Quick reactions players can fire without typing (relayed to the whole table).
const EMOTES = [
  { key: "ring", emoji: "🔔", label: "Hurry!" },
  { key: "love", emoji: "😘", label: "Sweety" },
  { key: "like", emoji: "👍", label: "Like" },
  { key: "dislike", emoji: "👎", label: "Dislike" },
  { key: "clap", emoji: "👏", label: "Nice" },
  { key: "haha", emoji: "😂", label: "Haha" },
  { key: "wow", emoji: "😮", label: "Wow" },
  { key: "think", emoji: "🤔", label: "Hmm" },
] as const;
const EMOJI: Record<string, string> = Object.fromEntries(EMOTES.map((e) => [e.key, e.emoji]));
import { HexBoard } from "./HexBoard.tsx";
import { EightsBoard } from "./EightsBoard.tsx";
import { JokeriBoard } from "./JokeriBoard.tsx";
import { AutoBoard } from "./AutoBoard.tsx";
import { SchemaBoard } from "./SchemaBoard.tsx";
import { RateBar } from "./RateBar.tsx";
import { gameMeta } from "./games.ts";
import type { StateMsg } from "./wire.ts";
import type { ChatMsg } from "./wire.ts";

// A player's outcome from a result that may be a single winner, a team
// winners/losers list (Jokeri, forfeits), or a draw.
function outcomeFor(result: StateMsg["result"], myId: string): "win" | "lose" | "draw" | null {
  if (!result) return null;
  if (result.draw) return "draw";
  if (result.winners?.length) return result.winners.includes(myId) ? "win" : "lose";
  if (result.losers?.length) return result.losers.includes(myId) ? "lose" : "win";
  if (result.winner) return result.winner === myId ? "win" : "lose";
  return null;
}

function resultText(s: StateMsg, myId: string, t: TFn): string {
  const o = outcomeFor(s.result, myId);
  const label = o === "draw" ? t("result.draw") : o === "win" ? t("result.youWin") : o === "lose" ? t("result.youLose") : t("result.gameOver");
  return `${label}${s.result?.reason ? ` — ${s.result.reason}` : ""}`;
}

export function Game({
  matchId,
  playerId,
  gameId,
  onLeave,
  onLeaderboard,
}: {
  matchId: string;
  playerId: string;
  gameId: string;
  onLeave: () => void;
  onLeaderboard?: () => void;
}) {
  const { t } = useT();
  const { state, connected, errors, chat, emotes, sendMove, sendChat, sendEmote } = useMatch(matchId, playerId);

  // Sound each incoming reaction once (ring for the bell, a soft blip otherwise).
  const lastEmoteId = useRef(0);
  useEffect(() => {
    const latest = emotes[emotes.length - 1];
    if (!latest || latest.id === lastEmoteId.current) return;
    lastEmoteId.current = latest.id;
    if (latest.emote === "ring") soundRing();
    else soundEmote();
  }, [emotes]);
  const meta = gameMeta(gameId);
  const [dismissed, setDismissed] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [leaveErr, setLeaveErr] = useState("");

  // Reset the "dismissed game-over" flag when we enter a different match.
  useEffect(() => {
    setDismissed(false);
    setConfirmLeave(false);
    setLeaveErr("");
  }, [matchId]);

  // Forfeit and quit: end the match (our team loses) so we're freed. Only leave
  // the page once the server confirms the match actually ended — otherwise show
  // the error and stay, so a failed leave never silently traps us in the match.
  async function forfeit() {
    setLeaving(true);
    setLeaveErr("");
    try {
      await leaveMatch(matchId);
      onLeave();
    } catch (e) {
      setLeaveErr((e as Error).message || "Could not leave the game — try again.");
      setLeaving(false);
    }
  }

  return (
    <div className="game">
      <div className="statusbar">
        <span className={connected ? "dot on" : "dot off"} title={connected ? t("game.connected") : t("game.offline")} />
        <span className="game-tag">
          {meta.emoji} {meta.name}
        </span>
        <code className="mid" title={t("game.matchId")}>{matchId}</code>
        {state && <span>{t("game.turnMove", { turn: state.turn, move: state.moveCount })}</span>}
        {state && !state.ended && (
          <span className={state.yourTurn ? "turn you" : "turn"}>
            {state.yourTurn ? t("game.yourTurn") : t("game.waiting")}
          </span>
        )}
        {state && !state.ended && <TurnTimer deadline={state.turnDeadline} yourTurn={state.yourTurn} />}
        {state?.ended && <span className="result">{resultText(state, playerId, t)}</span>}
        <span className="statusbar-actions">
          <SoundToggle />
          <button className="ghost" onClick={onLeave} title={t("game.backTitle")}>
            {t("game.back")}
          </button>
          {state && !state.ended && (
            <button className="ghost danger" onClick={() => { setLeaveErr(""); setConfirmLeave(true); }} disabled={leaving}>
              {leaving ? t("game.leaving") : t("game.leaveGame")}
            </button>
          )}
        </span>
      </div>

      <div className="game-stage">
        <div className="game-main">
          {state ? (
            meta.renderer === "hive" ? (
              <HexBoard state={state} playerId={playerId} onMove={sendMove} />
            ) : meta.renderer === "eights" ? (
              <EightsBoard state={state} playerId={playerId} onMove={sendMove} />
            ) : meta.renderer === "jokeri" ? (
              <JokeriBoard state={state} playerId={playerId} onMove={sendMove} />
            ) : state.G?.board ? (
              <SchemaBoard state={state} playerId={playerId} gameId={gameId} onMove={sendMove} />
            ) : (
              <AutoBoard state={state} onMove={sendMove} />
            )
          ) : (
            <p className="hint">{t("game.connecting")}</p>
          )}

          <RateBar gameId={gameId} name={meta.name} />

          {errors.length > 0 && (
            <ul className="errlist">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}

          <EmoteLayer emotes={emotes} myId={playerId} />
        </div>

        <Chat chat={chat} myId={playerId} connected={connected} onSend={sendChat} onEmote={sendEmote} />
      </div>

      {state?.ended && !dismissed && (
        <GameOver
          result={state.result}
          myId={playerId}
          meta={meta}
          onLeave={onLeave}
          onLeaderboard={onLeaderboard}
          onDismiss={() => setDismissed(true)}
        />
      )}

      {confirmLeave && (
        <div className="modal-backdrop" onClick={() => setConfirmLeave(false)}>
          <div className="modal confirm-leave" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3>{t("leave.title")}</h3>
            <p className="hint">{t("leave.body")}</p>
            {leaveErr && <p className="error">{leaveErr}</p>}
            <div className="ts-actions">
              <button className="ghost" onClick={() => setConfirmLeave(false)} disabled={leaving}>
                {t("leave.keepPlaying")}
              </button>
              <button className="danger" onClick={forfeit} disabled={leaving}>
                {leaving ? t("game.leaving") : t("leave.forfeit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mute/unmute the game's sound effects (persisted in localStorage).
function SoundToggle() {
  const { t } = useT();
  const [muted, setMutedState] = useState(isMuted());
  return (
    <button
      className="sound-toggle"
      onClick={() => {
        const m = !muted;
        setMuted(m);
        setMutedState(m);
      }}
      title={muted ? t("sound.muted") : t("sound.on")}
      aria-label={muted ? t("sound.muted") : t("sound.on")}
    >
      {muted ? "🔇" : "🔊"}
    </button>
  );
}

// A live per-turn countdown from the server's deadline. The gateway auto-plays a
// safe move when it hits zero, so this is a warning, not a hard client cutoff.
function TurnTimer({ deadline, yourTurn }: { deadline?: number; yourTurn: boolean }) {
  const { t } = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!deadline) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [deadline]);
  if (!deadline) return null;
  const left = Math.max(0, Math.ceil((deadline - now) / 1000));
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  const urgent = left <= 10;
  return (
    <span className={`turn-timer${urgent ? " urgent" : ""}${yourTurn ? " you" : ""}`} title={t("timer.title")}>
      ⏱ {mm}:{ss}
    </span>
  );
}

// Shown when the match ends: who won, and where to go next. The session is over —
// the board stops accepting moves (the server reports yourTurn=false once ended).
function GameOver({
  result,
  myId,
  meta,
  onLeave,
  onLeaderboard,
  onDismiss,
}: {
  result: StateMsg["result"];
  myId: string;
  meta: ReturnType<typeof gameMeta>;
  onLeave: () => void;
  onLeaderboard?: () => void;
  onDismiss: () => void;
}) {
  const { t } = useT();
  const o = outcomeFor(result, myId);
  const outcome = o ?? "lose";
  const title = o === "draw" ? t("go.draw") : o === "win" ? t("go.win") : t("go.lose");
  const emoji = o === "draw" ? "🤝" : o === "win" ? "🏆" : "😔";

  return (
    <div className="gameover-backdrop" onClick={onDismiss}>
      <div className={`gameover ${outcome}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="go-close" onClick={onDismiss} aria-label={t("go.viewBoard")}>×</button>
        <div className="go-emoji">{emoji}</div>
        <div className="go-eyebrow">{meta.emoji} {t("go.eyebrow", { game: meta.name })}</div>
        <h2 className="go-title">{title}</h2>
        {result?.reason && <p className="go-reason">{result.reason}</p>}
        <div className="go-actions">
          {onLeaderboard && (
            <button className="ghost" onClick={onLeaderboard}>{t("go.viewLeaderboard")}</button>
          )}
          <button onClick={onLeave}>{t("go.backToGames")}</button>
        </div>
        <button className="go-inspect" onClick={onDismiss}>{t("go.viewBoard")}</button>
      </div>
    </div>
  );
}

// Real-time in-match chat, relayed by the gateway to both players.
function Chat({
  chat,
  myId,
  connected,
  onSend,
  onEmote,
}: {
  chat: ChatMsg[];
  myId: string;
  connected: boolean;
  onSend: (text: string) => void;
  onEmote: (emote: string) => void;
}) {
  const { t } = useT();
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSend(text);
    setText("");
  }

  return (
    <aside className="chat">
      <div className="chat-head">
        <span className={connected ? "live-dot" : "live-dot off"} /> {t("chat.title")}
      </div>
      <div className="chat-log" ref={logRef}>
        {chat.length === 0 ? (
          <p className="chat-empty">{t("chat.empty")}</p>
        ) : (
          chat.map((m, i) => (
            <div key={i} className={m.from === myId ? "chat-msg me" : "chat-msg"}>
              <span className="chat-name">{m.from === myId ? t("common.you") : m.name || t("common.player")}</span>
              <span className="chat-text">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <div className="emote-bar">
        {EMOTES.map((e) => (
          <button
            key={e.key}
            className="emote-btn"
            onClick={() => onEmote(e.key)}
            disabled={!connected}
            title={t("emote." + e.key)}
            aria-label={t("emote." + e.key)}
          >
            {e.emoji}
          </button>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={connected ? t("chat.message") : t("chat.reconnecting")}
          maxLength={500}
          disabled={!connected}
          aria-label="chat message"
        />
        <button type="submit" disabled={!connected || !text.trim()}>{t("chat.send")}</button>
      </form>
    </aside>
  );
}

// Floating reactions that pop over the board and drift up as they fade. Own
// reactions lean right, others left, so a table exchange reads at a glance.
function EmoteLayer({ emotes, myId }: { emotes: LiveEmote[]; myId: string }) {
  const { t } = useT();
  if (emotes.length === 0) return null;
  return (
    <div className="emote-layer" aria-hidden>
      {emotes.map((e, i) => (
        <div key={e.id} className={`emote-pop ${e.from === myId ? "mine" : ""}`} style={{ ["--i" as string]: i }}>
          <span className="emote-face">{EMOJI[e.emote] ?? "❓"}</span>
          <span className="emote-who">{e.from === myId ? t("common.you") : e.name || t("common.player")}</span>
        </div>
      ))}
    </div>
  );
}
