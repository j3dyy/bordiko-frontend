import { useEffect, useRef, useState } from "react";
import { useMatch } from "./useMatch.ts";
import { HexBoard } from "./HexBoard.tsx";
import { EightsBoard } from "./EightsBoard.tsx";
import { AutoBoard } from "./AutoBoard.tsx";
import { RateBar } from "./RateBar.tsx";
import { gameMeta } from "./games.ts";
import type { ChatMsg, StateMsg } from "./wire.ts";

function resultText(s: StateMsg, myId: string): string {
  if (s.result?.draw) return "Draw";
  if (s.result?.winner) {
    const who = s.result.winner === myId ? "You win" : "You lose";
    return `${who}${s.result.reason ? ` — ${s.result.reason}` : ""}`;
  }
  return "Game over";
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
  const { state, connected, errors, chat, sendMove, sendChat } = useMatch(matchId, playerId);
  const meta = gameMeta(gameId);
  const [dismissed, setDismissed] = useState(false);

  // Reset the "dismissed game-over" flag when we enter a different match.
  useEffect(() => {
    setDismissed(false);
  }, [matchId]);

  return (
    <div className="game">
      <div className="statusbar">
        <span className={connected ? "dot on" : "dot off"} title={connected ? "connected" : "offline"} />
        <span className="game-tag">
          {meta.emoji} {meta.name}
        </span>
        <code className="mid" title="match id">{matchId}</code>
        {state && <span>turn {state.turn} · move {state.moveCount}</span>}
        {state && !state.ended && (
          <span className={state.yourTurn ? "turn you" : "turn"}>
            {state.yourTurn ? "● your turn" : "waiting…"}
          </span>
        )}
        {state?.ended && <span className="result">{resultText(state, playerId)}</span>}
        <button className="ghost" onClick={onLeave}>
          Leave
        </button>
      </div>

      <div className="game-stage">
        <div className="game-main">
          {state ? (
            meta.renderer === "hive" ? (
              <HexBoard state={state} playerId={playerId} onMove={sendMove} />
            ) : meta.renderer === "eights" ? (
              <EightsBoard state={state} playerId={playerId} onMove={sendMove} />
            ) : (
              <AutoBoard state={state} onMove={sendMove} />
            )
          ) : (
            <p className="hint">Connecting…</p>
          )}

          <RateBar gameId={gameId} name={meta.name} />

          {errors.length > 0 && (
            <ul className="errlist">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <Chat chat={chat} myId={playerId} connected={connected} onSend={sendChat} />
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
    </div>
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
  const draw = !!result?.draw;
  const won = !draw && result?.winner === myId;
  const outcome = draw ? "draw" : won ? "win" : "lose";
  const title = draw ? "It's a draw" : won ? "You win!" : "You lose";
  const emoji = draw ? "🤝" : won ? "🏆" : "😔";

  return (
    <div className="gameover-backdrop" onClick={onDismiss}>
      <div className={`gameover ${outcome}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="go-close" onClick={onDismiss} aria-label="view final board">×</button>
        <div className="go-emoji">{emoji}</div>
        <div className="go-eyebrow">{meta.emoji} {meta.name} · game over</div>
        <h2 className="go-title">{title}</h2>
        {result?.reason && <p className="go-reason">{result.reason}</p>}
        <div className="go-actions">
          {onLeaderboard && (
            <button className="ghost" onClick={onLeaderboard}>View leaderboard</button>
          )}
          <button onClick={onLeave}>Back to games</button>
        </div>
        <button className="go-inspect" onClick={onDismiss}>View final board</button>
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
}: {
  chat: ChatMsg[];
  myId: string;
  connected: boolean;
  onSend: (text: string) => void;
}) {
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
        <span className={connected ? "live-dot" : "live-dot off"} /> Chat
      </div>
      <div className="chat-log" ref={logRef}>
        {chat.length === 0 ? (
          <p className="chat-empty">No messages yet — say hi to your opponent 👋</p>
        ) : (
          chat.map((m, i) => (
            <div key={i} className={m.from === myId ? "chat-msg me" : "chat-msg"}>
              <span className="chat-name">{m.from === myId ? "You" : m.name || "Player"}</span>
              <span className="chat-text">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={connected ? "Message…" : "Reconnecting…"}
          maxLength={500}
          disabled={!connected}
          aria-label="chat message"
        />
        <button type="submit" disabled={!connected || !text.trim()}>Send</button>
      </form>
    </aside>
  );
}
