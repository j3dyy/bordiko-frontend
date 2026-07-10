import { useEffect, useState } from "react";
import { gameMeta, playersLabel } from "./games.ts";

// Colors for the two partnerships (also used by the Waiting table room).
export const TEAM_COLORS = ["#6C4CF1", "#FF6A3D"];

// The "New table" chooser: pick how many seats and — when the count is even and
// at least four — whether it's a free-for-all or a partnership (teams) table.
// Teams mode seats partners across from each other, so where you sit is how you
// choose your side.
export function TableSetup({
  gameId,
  busy,
  err,
  onSubmit,
  onClose,
}: {
  gameId: string;
  busy: boolean;
  err: string;
  onSubmit: (seats: number, mode: "solo" | "teams") => void;
  onClose: () => void;
}) {
  const m = gameMeta(gameId);
  const [seats, setSeats] = useState(m.minPlayers);
  const [mode, setMode] = useState<"solo" | "teams">("solo");

  const counts: number[] = [];
  for (let n = m.minPlayers; n <= m.maxPlayers; n++) counts.push(n);
  const teamsEligible = seats >= 4 && seats % 2 === 0;

  // Keep the mode valid if the seat count changes to something teams can't use.
  useEffect(() => {
    if (!teamsEligible && mode === "teams") setMode("solo");
  }, [teamsEligible, mode]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal table-setup"
        onClick={(e) => e.stopPropagation()}
        style={{ ["--accent" as string]: m.accent }}
      >
        <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        <div className="ts-head">
          <span className="game-emoji big">{m.emoji}</span>
          <div>
            <h3>New {m.name} table</h3>
            <p className="hint">{playersLabel(m)} players</p>
          </div>
        </div>

        {counts.length > 1 && (
          <div className="ts-field">
            <span className="ts-label">Players</span>
            <div className="seg">
              {counts.map((n) => (
                <button
                  key={n}
                  className={n === seats ? "seg-btn active" : "seg-btn"}
                  onClick={() => setSeats(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}

        {teamsEligible && (
          <div className="ts-field">
            <span className="ts-label">Format</span>
            <div className="ts-formats">
              <button className={mode === "solo" ? "fmt active" : "fmt"} onClick={() => setMode("solo")}>
                <span className="fmt-title">Free-for-all</span>
                <span className="fmt-sub">Everyone for themselves</span>
              </button>
              <button className={mode === "teams" ? "fmt active" : "fmt"} onClick={() => setMode("teams")}>
                <span className="fmt-title">Teams</span>
                <span className="fmt-sub">
                  Partners across · {seats / 2} v {seats / 2}
                </span>
              </button>
            </div>
          </div>
        )}

        {mode === "teams" && teamsEligible && <TeamPreview seats={seats} />}

        {err && <p className="error">{err}</p>}
        <div className="ts-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy} onClick={() => onSubmit(seats, teamsEligible ? mode : "solo")}>
            {busy ? "Creating…" : "Create table"}
          </button>
        </div>
      </div>
    </div>
  );
}

// A tiny diagram of the two partnerships: seat numbers colored by team.
function TeamPreview({ seats }: { seats: number }) {
  const teamA: number[] = [];
  const teamB: number[] = [];
  for (let i = 0; i < seats; i++) (i % 2 === 0 ? teamA : teamB).push(i + 1);
  return (
    <div className="ts-preview">
      <div className="ts-team" style={{ ["--team" as string]: TEAM_COLORS[0] }}>
        <span className="ts-team-tag">Team A</span>
        <span className="ts-team-seats">seats {teamA.join(" & ")}</span>
      </div>
      <span className="ts-vs">vs</span>
      <div className="ts-team" style={{ ["--team" as string]: TEAM_COLORS[1] }}>
        <span className="ts-team-tag">Team B</span>
        <span className="ts-team-seats">seats {teamB.join(" & ")}</span>
      </div>
    </div>
  );
}
