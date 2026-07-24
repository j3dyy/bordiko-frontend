import { useEffect, useMemo, useState } from "react";
import { gameMeta, gameOptions, playersLabel } from "./games.ts";
import { useT } from "./i18n.tsx";
import type { GameOption } from "./wire.ts";

// Colors for the two partnerships (also used by the Waiting table room).
export const TEAM_COLORS = ["#6C4CF1", "#FF6A3D"];

// The "New table" chooser: pick how many seats and — when the count is even and
// at least four — whether it's a free-for-all or a partnership (teams) table.
// Teams mode seats partners across from each other, so where you sit is how you
// choose your side.
export function TableSetup({
  gameId,
  options: catalogOptions,
  realtime,
  busy,
  err,
  onSubmit,
  onClose,
}: {
  gameId: string;
  options?: GameOption[];
  realtime?: boolean;
  busy: boolean;
  err: string;
  onSubmit: (seats: number, mode: "solo" | "teams", visibility: "public" | "private", password: string, options: Record<string, unknown>) => void;
  onClose: () => void;
}) {
  const m = gameMeta(gameId);
  // The game's declared table options (from its manifest, via the catalog), with a
  // built-in fallback for first-party games not yet re-published.
  const options = useMemo(() => gameOptions(gameId, catalogOptions), [gameId, catalogOptions]);
  const [seats, setSeats] = useState(m.minPlayers);
  const [mode, setMode] = useState<"solo" | "teams">("solo");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [password, setPassword] = useState("");
  // Platform "Turn clock" — off by default; the host opts a table into timing.
  // Encoded as parseTurnClock reads it on the gateway: "off" | "move:<s>" | "chess:<s>".
  const [turnClock, setTurnClock] = useState("off");
  // Chosen option values, keyed by option id, initialised to each option's default.
  const [optVals, setOptVals] = useState<Record<string, string | number | boolean>>(
    () => Object.fromEntries(options.map((o) => [o.id, o.default])),
  );
  useEffect(() => {
    setOptVals(Object.fromEntries(options.map((o) => [o.id, o.default])));
  }, [options]);

  const counts: number[] = [];
  for (let n = m.minPlayers; n <= m.maxPlayers; n++) counts.push(n);
  const teamsEligible = seats >= 4 && seats % 2 === 0;

  // Keep the mode valid if the seat count changes to something teams can't use.
  useEffect(() => {
    if (!teamsEligible && mode === "teams") setMode("solo");
  }, [teamsEligible, mode]);

  const { t } = useT();

  // Turn-clock choices (hidden for real-time games, which are driven by a tick clock).
  const clockChoices = [
    { value: "off", label: t("ts.clockOff"), sub: t("ts.clockOffSub") },
    { value: "move:30", label: "30s", sub: t("ts.clockMoveSub") },
    { value: "chess:300", label: "5 min", sub: t("ts.clockChessSub") },
    { value: "chess:600", label: "10 min", sub: t("ts.clockChessSub") },
  ];

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
            <h3>{t("ts.newTable", { game: m.name })}</h3>
            <p className="hint">{t("ts.playersLabel", { players: playersLabel(m) })}</p>
          </div>
        </div>

        {counts.length > 1 && (
          <div className="ts-field">
            <span className="ts-label">{t("ts.players")}</span>
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
            <span className="ts-label">{t("ts.format")}</span>
            <div className="ts-formats">
              <button className={mode === "solo" ? "fmt active" : "fmt"} onClick={() => setMode("solo")}>
                <span className="fmt-title">{t("ts.free")}</span>
                <span className="fmt-sub">{t("ts.freeSub")}</span>
              </button>
              <button className={mode === "teams" ? "fmt active" : "fmt"} onClick={() => setMode("teams")}>
                <span className="fmt-title">{t("ts.teams")}</span>
                <span className="fmt-sub">
                  {t("ts.teamsSub", { a: seats / 2, b: seats / 2 })}
                </span>
              </button>
            </div>
          </div>
        )}

        {mode === "teams" && teamsEligible && <TeamPreview seats={seats} />}

        {/* Game-declared table options (match length, khisht, …) rendered generically. */}
        {options.map((o) => (
          <div className="ts-field" key={o.id}>
            <span className="ts-label">{o.label}</span>
            <div className="seg">
              {o.type === "toggle" ? (
                <>
                  <button
                    className={optVals[o.id] ? "seg-btn" : "seg-btn active"}
                    onClick={() => setOptVals((v) => ({ ...v, [o.id]: false }))}
                  >
                    Off
                  </button>
                  <button
                    className={optVals[o.id] ? "seg-btn active" : "seg-btn"}
                    onClick={() => setOptVals((v) => ({ ...v, [o.id]: true }))}
                  >
                    On
                  </button>
                </>
              ) : (
                (o.choices ?? []).map((c) => (
                  <button
                    key={String(c.value)}
                    className={optVals[o.id] === c.value ? "seg-btn active" : "seg-btn"}
                    onClick={() => setOptVals((v) => ({ ...v, [o.id]: c.value }))}
                    title={c.sub}
                  >
                    {c.label}
                  </button>
                ))
              )}
            </div>
          </div>
        ))}

        {/* Platform turn clock — turn-based games only (real-time games are tick-driven). */}
        {!realtime && (
          <div className="ts-field">
            <span className="ts-label">{t("ts.turnClock")}</span>
            <div className="seg">
              {clockChoices.map((c) => (
                <button
                  key={c.value}
                  className={turnClock === c.value ? "seg-btn active" : "seg-btn"}
                  onClick={() => setTurnClock(c.value)}
                  title={c.sub}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ts-field">
          <span className="ts-label">{t("ts.visibility")}</span>
          <div className="ts-formats">
            <button className={visibility === "public" ? "fmt active" : "fmt"} onClick={() => setVisibility("public")}>
              <span className="fmt-title">{t("ts.public")}</span>
              <span className="fmt-sub">{t("ts.publicSub")}</span>
            </button>
            <button className={visibility === "private" ? "fmt active" : "fmt"} onClick={() => setVisibility("private")}>
              <span className="fmt-title">{t("ts.private")}</span>
              <span className="fmt-sub">{t("ts.privateSub")}</span>
            </button>
          </div>
        </div>

        {visibility === "private" && (
          <div className="ts-field">
            <span className="ts-label">{t("ts.password")} <span className="ts-optional">{t("ts.optional")}</span></span>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("ts.passwordPlaceholder")}
              maxLength={64}
              autoComplete="off"
            />
          </div>
        )}

        {err && <p className="error">{err}</p>}
        <div className="ts-actions">
          <button className="ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            disabled={busy}
            onClick={() => onSubmit(seats, teamsEligible ? mode : "solo", visibility, visibility === "private" ? password.trim() : "", realtime ? optVals : { ...optVals, turnClock })}
          >
            {busy ? t("ts.creating") : t("ts.createTable")}
          </button>
        </div>
      </div>
    </div>
  );
}

// A tiny diagram of the two partnerships: seat numbers colored by team.
function TeamPreview({ seats }: { seats: number }) {
  const { t } = useT();
  const teamA: number[] = [];
  const teamB: number[] = [];
  for (let i = 0; i < seats; i++) (i % 2 === 0 ? teamA : teamB).push(i + 1);
  return (
    <div className="ts-preview">
      <div className="ts-team" style={{ ["--team" as string]: TEAM_COLORS[0] }}>
        <span className="ts-team-tag">{t("ts.teamA")}</span>
        <span className="ts-team-seats">{t("ts.seatsList", { seats: teamA.join(" & ") })}</span>
      </div>
      <span className="ts-vs">{t("ts.vs")}</span>
      <div className="ts-team" style={{ ["--team" as string]: TEAM_COLORS[1] }}>
        <span className="ts-team-tag">{t("ts.teamB")}</span>
        <span className="ts-team-seats">{t("ts.seatsList", { seats: teamB.join(" & ") })}</span>
      </div>
    </div>
  );
}
