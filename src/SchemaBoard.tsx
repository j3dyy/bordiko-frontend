import { useEffect, useMemo, useState } from "react";
import { Card } from "./CardArt.tsx";
import { assetUrl } from "./boardview.ts";
import type { BoardView, ItemView, PromptView, SeatView, TrackView, MoveRef } from "./boardview.ts";
import type { StateMsg } from "./wire.ts";

// The generic declarative renderer (Option 1). A game emits a BoardView under
// `state.G.board` from its playerView; this draws it — seats around a table, the
// progress tracks, item zones, and the acting player's typed prompt — with no
// game-specific code. This is what lets a marketplace game ship a real board
// (and, later, its own art) without any bespoke UI.
export function SchemaBoard({
  state,
  playerId,
  gameId,
  onMove,
}: {
  state: StateMsg;
  playerId: string;
  gameId: string;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
}) {
  const board = state.G?.board as BoardView | undefined;
  const nameOf = (id: string) => state.names?.[id] ?? id;

  if (!board) return null;
  const accent = board.palette?.accent;

  return (
    <div className="schemaboard" style={accent ? ({ ["--accent" as string]: accent } as React.CSSProperties) : undefined}>
      {board.banner && <div className="sb-banner">{board.banner}</div>}
      {(board.status?.phase || board.status?.note) && (
        <div className="sb-status">
          {board.status?.phase && <span className="sb-phase">{board.status.phase}</span>}
          {board.status?.note && <span className="sb-note">{board.status.note}</span>}
        </div>
      )}

      {board.tracks?.map((tr) => (
        <Track key={tr.id} track={tr} />
      ))}

      {board.seats && board.seats.length > 0 && (
        <div className="sb-seats">
          {board.seats.map((s) => (
            <Seat key={s.id} seat={s} me={playerId} gameId={gameId} nameOf={nameOf} />
          ))}
        </div>
      )}

      {board.zones?.map((z) => (
        <div key={z.id} className="sb-zone">
          {z.label && <div className="sb-zone-lbl">{z.label}</div>}
          <div className={`sb-items ${z.layout}`}>
            {z.items.map((it, i) => (
              <Item key={it.id ?? i} item={it} gameId={gameId} />
            ))}
          </div>
        </div>
      ))}

      {state.yourTurn && !state.ended && board.prompt && (
        <Prompt prompt={board.prompt} seats={board.seats ?? []} nameOf={nameOf} onMove={onMove} moveCount={state.moveCount} />
      )}
    </div>
  );
}

function Track({ track }: { track: TrackView }) {
  return (
    <div className="sb-track">
      {track.label && <span className="sb-track-lbl">{track.label}</span>}
      <div className="sb-track-steps">
        {track.steps.map((st, i) => (
          <span key={i} className={`sb-step ${st.state ?? "pending"}`} title={st.state}>
            {st.state === "success" ? "✓" : st.state === "fail" ? "✕" : st.label ?? i + 1}
          </span>
        ))}
      </div>
    </div>
  );
}

function Seat({ seat, me, gameId, nameOf }: { seat: SeatView; me?: string; gameId: string; nameOf: (id: string) => string }) {
  const isMe = seat.id === me;
  return (
    <div className={`sb-seat${isMe ? " me" : ""}`} style={seat.color ? ({ ["--seat" as string]: seat.color } as React.CSSProperties) : undefined}>
      <div className="sb-avatar">
        {seat.roleArt ? <img src={assetUrl(gameId, seat.roleArt)} alt="" /> : (nameOf(seat.id).trim()[0] ?? "?").toUpperCase()}
      </div>
      <div className="sb-seat-name">{seat.name ?? nameOf(seat.id)}</div>
      {seat.role && <div className="sb-role">{seat.role}</div>}
      {seat.badges && seat.badges.length > 0 && (
        <div className="sb-badges">
          {seat.badges.map((b, i) => (
            <span key={i} className="sb-badge">{b}</span>
          ))}
        </div>
      )}
      {seat.status && <div className="sb-seat-status">{seat.status}</div>}
    </div>
  );
}

function Item({ item, gameId }: { item: ItemView; gameId: string }) {
  if (item.kind === "card") {
    if (item.faceDown) return <div className="sb-card facedown" />;
    if (item.art) return <img className="sb-card-art" src={assetUrl(gameId, item.art)} alt={item.tag ?? ""} />;
    if (item.face?.r && item.face?.s) return <Card r={item.face.r} s={item.face.s} size={64} />;
    return <div className="sb-card">{item.text ?? "?"}</div>;
  }
  if (item.kind === "token") {
    return (
      <span className="sb-token" style={item.color ? { background: item.color } : undefined}>
        {item.art ? <img src={assetUrl(gameId, item.art)} alt="" /> : item.text}
      </span>
    );
  }
  return <span className="sb-text">{item.text}</span>;
}

function Prompt({
  prompt,
  seats,
  nameOf,
  onMove,
  moveCount,
}: {
  prompt: PromptView;
  seats: SeatView[];
  nameOf: (id: string) => string;
  onMove: (type: string, payload?: Record<string, unknown>) => void;
  moveCount: number;
}) {
  const submit = (m: MoveRef, extra?: Record<string, unknown>) =>
    onMove(m.type, { ...((m.payload as Record<string, unknown>) ?? {}), ...(extra ?? {}) });

  if (prompt.kind === "buttons") {
    return (
      <div className="sb-prompt">
        {prompt.label && <div className="sb-prompt-lbl">{prompt.label}</div>}
        <div className="sb-prompt-btns">
          {prompt.options.map((o, i) => (
            <button key={i} onClick={() => submit(o.move)} style={o.color ? { background: o.color } : undefined}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (prompt.kind === "vote") {
    return (
      <div className="sb-prompt">
        {prompt.label && <div className="sb-prompt-lbl">{prompt.label}</div>}
        <div className="sb-prompt-btns">
          <button className="sb-yes" onClick={() => submit(prompt.yes)}>{prompt.yesLabel ?? "Approve"}</button>
          <button className="sb-no" onClick={() => submit(prompt.no)}>{prompt.noLabel ?? "Reject"}</button>
        </div>
      </div>
    );
  }

  // pickSeats: select `count` seats then submit.
  return <PickSeats prompt={prompt} seats={seats} nameOf={nameOf} onSubmit={submit} moveCount={moveCount} />;
}

function PickSeats({
  prompt,
  seats,
  nameOf,
  onSubmit,
  moveCount,
}: {
  prompt: Extract<PromptView, { kind: "pickSeats" }>;
  seats: SeatView[];
  nameOf: (id: string) => string;
  onSubmit: (m: MoveRef, extra?: Record<string, unknown>) => void;
  moveCount: number;
}) {
  const [sel, setSel] = useState<string[]>([]);
  useEffect(() => setSel([]), [moveCount]); // reset when the turn advances
  const pool = useMemo(
    () => (prompt.from && prompt.from.length ? seats.filter((s) => prompt.from!.includes(s.id)) : seats),
    [prompt.from, seats],
  );
  const toggle = (id: string) =>
    setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < prompt.count ? [...cur, id] : cur));

  return (
    <div className="sb-prompt">
      <div className="sb-prompt-lbl">{prompt.label ?? `Pick ${prompt.count}`}</div>
      <div className="sb-pickseats">
        {pool.map((s) => (
          <button
            key={s.id}
            className={`sb-pick${sel.includes(s.id) ? " on" : ""}`}
            onClick={() => toggle(s.id)}
          >
            {s.name ?? nameOf(s.id)}
          </button>
        ))}
      </div>
      <button
        className="sb-pick-submit"
        disabled={sel.length !== prompt.count}
        onClick={() => onSubmit(prompt.move, { players: sel })}
      >
        {prompt.submitLabel ?? `Confirm (${sel.length}/${prompt.count})`}
      </button>
    </div>
  );
}
