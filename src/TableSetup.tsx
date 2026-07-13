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
  onSubmit: (seats: number, mode: "solo" | "teams", visibility: "public" | "private", password: string, khisht: string, format: string) => void;
  onClose: () => void;
}) {
  const m = gameMeta(gameId);
  const [seats, setSeats] = useState(m.minPlayers);
  const [mode, setMode] = useState<"solo" | "teams">("solo");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [password, setPassword] = useState("");
  // Jokeri only: the khisht penalty (failed positive bid). "spec" = −100 × the
  // deal size (the classic paper rule); otherwise a flat number.
  const [khisht, setKhisht] = useState("spec");
  // Jokeri only: the deal schedule. "standard" = the full 24-deal classic;
  // "nines" = direct-nines (eight 9-card deals, a faster game).
  const [jokeriFormat, setJokeriFormat] = useState("standard");
  const isJokeri = gameId === "jokeri";

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

        {isJokeri && (
          <div className="ts-field">
            <span className="ts-label">Deal schedule</span>
            <div className="ts-formats">
              <button
                className={jokeriFormat === "standard" ? "fmt active" : "fmt"}
                onClick={() => setJokeriFormat("standard")}
              >
                <span className="fmt-title">Standard</span>
                <span className="fmt-sub">Classic 24 deals · 1→8, 9s, 8→1, 9s</span>
              </button>
              <button
                className={jokeriFormat === "nines" ? "fmt active" : "fmt"}
                onClick={() => setJokeriFormat("nines")}
              >
                <span className="fmt-title">Direct nines</span>
                <span className="fmt-sub">Eight 9-card deals · faster</span>
              </button>
            </div>
          </div>
        )}

        {isJokeri && (
          <div className="ts-field">
            <span className="ts-label">Khisht <span className="ts-optional">failed bid</span></span>
            <div className="seg">
              {(
                [
                  { v: "spec", label: "−100 × deal", sub: "classic" },
                  { v: "-200", label: "−200", sub: "flat" },
                  { v: "-500", label: "−500", sub: "harsh" },
                ] as const
              ).map((o) => (
                <button
                  key={o.v}
                  className={o.v === khisht ? "seg-btn active" : "seg-btn"}
                  onClick={() => setKhisht(o.v)}
                  title={o.sub}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ts-field">
          <span className="ts-label">Visibility</span>
          <div className="ts-formats">
            <button className={visibility === "public" ? "fmt active" : "fmt"} onClick={() => setVisibility("public")}>
              <span className="fmt-title">Public</span>
              <span className="fmt-sub">Listed in “Live now”</span>
            </button>
            <button className={visibility === "private" ? "fmt active" : "fmt"} onClick={() => setVisibility("private")}>
              <span className="fmt-title">🔒 Private</span>
              <span className="fmt-sub">Invite by link only</span>
            </button>
          </div>
        </div>

        {visibility === "private" && (
          <div className="ts-field">
            <span className="ts-label">Password <span className="ts-optional">optional</span></span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for link-only"
              maxLength={64}
              autoComplete="off"
            />
          </div>
        )}

        {err && <p className="error">{err}</p>}
        <div className="ts-actions">
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={() => onSubmit(seats, teamsEligible ? mode : "solo", visibility, visibility === "private" ? password.trim() : "", isJokeri ? khisht : "", isJokeri ? jokeriFormat : "")}
          >
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
