import { useCallback, useEffect, useRef, useState } from "react";
import { cancelLobby, getLobby, sitSeat, standSeat, startLobby } from "./api.ts";
import { gameMeta } from "./games.ts";
import { TEAM_COLORS } from "./TableSetup.tsx";
import { lobbyFull, seatedCount } from "./wire.ts";
import type { Lobby, Seat } from "./wire.ts";

// The table room. After creating or joining a table you land here: a ring of
// seats you can sit in (in teams mode, where you sit is which side you're on),
// live-updated as others take their places. The host starts the match once every
// seat is filled; everyone is then handed off to the live game.
export function Waiting({
  lobbyId,
  myId,
  onStart,
  onCancel,
}: {
  lobbyId: string;
  myId: string;
  onStart: (matchId: string, gameId: string) => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState<Lobby | null>(null);
  const [acting, setActing] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<number | null>(null);
  const onStartRef = useRef(onStart);
  const onCancelRef = useRef(onCancel);
  onStartRef.current = onStart;
  onCancelRef.current = onCancel;

  useEffect(() => {
    const poll = async () => {
      try {
        const l = await getLobby(lobbyId);
        setCurrent(l);
        if (l.status === "started" && l.matchId) onStartRef.current(l.matchId, l.gameId);
      } catch {
        onCancelRef.current(); // table vanished (cancelled elsewhere)
      }
    };
    timer.current = window.setInterval(poll, 1200);
    void poll();
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [lobbyId]);

  // Route into an already-active match if an action reports one (resume).
  const resumeIfActive = useCallback(
    (e: unknown): boolean => {
      const active = (e as { active?: { matchId: string; gameId: string } }).active;
      if (active) {
        onStartRef.current(active.matchId, active.gameId);
        return true;
      }
      return false;
    },
    [],
  );

  const run = useCallback(
    async (fn: () => Promise<Lobby | void>) => {
      setActing(true);
      setErr("");
      try {
        const l = await fn();
        if (l) setCurrent(l);
      } catch (e) {
        if (!resumeIfActive(e)) setErr(String((e as Error).message ?? e));
      } finally {
        setActing(false);
      }
    },
    [resumeIfActive],
  );

  if (!current) {
    return (
      <div className="waiting">
        <div className="waiting-card">
          <div className="spinner" />
          <p className="waiting-status">Loading table…</p>
        </div>
      </div>
    );
  }

  const m = gameMeta(current.gameId);
  const isHost = current.host === myId;
  const mySeat = current.seats.find((s) => s.player?.id === myId)?.index ?? -1;
  const seated = mySeat >= 0;
  const full = lobbyFull(current);
  const filled = seatedCount(current);
  const total = current.seats.length;

  const sit = (i: number) => run(() => sitSeat(current.id, i));
  const stand = () => run(() => standSeat(current.id));
  const start = () => run(() => startLobby(current.id));

  async function leave() {
    setActing(true);
    try {
      if (isHost) await cancelLobby(current!.id);
      else if (seated) await standSeat(current!.id).catch(() => {});
    } finally {
      onCancelRef.current();
    }
  }

  const statusLine = full
    ? isHost
      ? "All seats filled — start when ready"
      : "Waiting for the host to start…"
    : `Waiting for players… ${filled}/${total}`;

  return (
    <div className="waiting">
      <div className="table-room" style={{ ["--accent" as string]: m.accent }}>
        <div className="table-topline">
          <div className="table-title">
            <span className="game-emoji">{m.emoji}</span>
            <h2>{m.name}</h2>
          </div>
          <span className={current.mode === "teams" ? "mode-badge teams" : "mode-badge"}>
            {current.mode === "teams" ? "Teams · partners across" : "Free-for-all"}
          </span>
        </div>

        <div className="table-ring">
          {current.seats.map((s) => (
            <SeatView
              key={s.index}
              seat={s}
              total={total}
              mode={current.mode}
              hostId={current.host}
              myId={myId}
              seatedElsewhere={seated && mySeat !== s.index}
              disabled={acting}
              onSit={() => sit(s.index)}
            />
          ))}

          <div className="table-center">
            <div className="spinner small" />
            <p className="table-status">{statusLine}</p>
            {isHost ? (
              <button className="start-btn" disabled={!full || acting} onClick={start}>
                {full ? "▶ Start game" : `${filled}/${total} seated`}
              </button>
            ) : (
              <div className="table-center-hint">seat {filled}/{total}</div>
            )}
          </div>
        </div>

        <div className="table-controls">
          {seated ? (
            <button className="ghost" disabled={acting} onClick={stand}>
              Stand up
            </button>
          ) : (
            <span className="hint">Pick a seat to join{current.mode === "teams" ? " and choose your team" : ""}.</span>
          )}
          <div className="table-code">
            table code <code>{current.id}</code>
          </div>
          <button className="ghost" disabled={acting} onClick={leave}>
            {isHost ? "Cancel table" : "Leave"}
          </button>
        </div>

        {err && <p className="error">{err}</p>}
        <p className="hint center">Share this page — anyone signed in can join from “Live now”.</p>
      </div>
    </div>
  );
}

// One seat positioned around the table circle. Team mode tints it by partnership.
function SeatView({
  seat,
  total,
  mode,
  hostId,
  myId,
  seatedElsewhere,
  disabled,
  onSit,
}: {
  seat: Seat;
  total: number;
  mode: "solo" | "teams";
  hostId: string;
  myId: string;
  seatedElsewhere: boolean;
  disabled: boolean;
  onSit: () => void;
}) {
  // Seat 0 at the top, going clockwise.
  const angle = (seat.index / total) * 2 * Math.PI - Math.PI / 2;
  const R = 43; // percent radius from the center
  const left = 50 + R * Math.cos(angle);
  const top = 50 + R * Math.sin(angle);
  const teamColor = mode === "teams" ? TEAM_COLORS[seat.team % TEAM_COLORS.length] : "";
  const style: React.CSSProperties = {
    left: `${left}%`,
    top: `${top}%`,
    ...(teamColor ? { ["--team" as string]: teamColor } : {}),
  };
  const p = seat.player;
  const isMe = p?.id === myId;
  const isHost = p?.id === hostId;

  return (
    <div className={`seat${p ? " filled" : " empty"}${teamColor ? " teamed" : ""}${isMe ? " me" : ""}`} style={style}>
      {mode === "teams" && (
        <span className="seat-team">{seat.team === 0 ? "A" : "B"}</span>
      )}
      {p ? (
        <>
          <span className="seat-avatar">{(p.name.trim()[0] ?? "?").toUpperCase()}</span>
          <span className="seat-name">{p.name}</span>
          <span className="seat-badges">
            {isHost && <span className="seat-badge host">Host</span>}
            {isMe && <span className="seat-badge you">You</span>}
          </span>
        </>
      ) : (
        <>
          <span className="seat-num">Seat {seat.index + 1}</span>
          <button className="seat-sit" disabled={disabled} onClick={onSit}>
            {seatedElsewhere ? "Move here" : "Sit here"}
          </button>
        </>
      )}
    </div>
  );
}
