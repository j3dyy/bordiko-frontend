import { useEffect, useState } from "react";
import { gameMeta, playersLabel } from "./games.ts";
import { useT } from "./i18n.tsx";

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
  // Backgammon only: match length. "" = a single game; "bo3"/"bo5" = best-of-N
  // (first to a majority of game-wins). Carried over the shared `format` field.
  const [bgFormat, setBgFormat] = useState("");
  const isBackgammon = gameId === "backgammon";

  const counts: number[] = [];
  for (let n = m.minPlayers; n <= m.maxPlayers; n++) counts.push(n);
  const teamsEligible = seats >= 4 && seats % 2 === 0;

  // Keep the mode valid if the seat count changes to something teams can't use.
  useEffect(() => {
    if (!teamsEligible && mode === "teams") setMode("solo");
  }, [teamsEligible, mode]);

  const { t } = useT();

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

        {isJokeri && (
          <div className="ts-field">
            <span className="ts-label">{t("ts.dealSchedule")}</span>
            <div className="ts-formats">
              <button
                className={jokeriFormat === "standard" ? "fmt active" : "fmt"}
                onClick={() => setJokeriFormat("standard")}
              >
                <span className="fmt-title">{t("ts.standard")}</span>
                <span className="fmt-sub">{t("ts.standardSub")}</span>
              </button>
              <button
                className={jokeriFormat === "nines" ? "fmt active" : "fmt"}
                onClick={() => setJokeriFormat("nines")}
              >
                <span className="fmt-title">{t("ts.nines")}</span>
                <span className="fmt-sub">{t("ts.ninesSub")}</span>
              </button>
            </div>
          </div>
        )}

        {isJokeri && (
          <div className="ts-field">
            <span className="ts-label">{t("ts.khisht")} <span className="ts-optional">{t("ts.failedBid")}</span></span>
            <div className="seg">
              {(
                [
                  { v: "spec", label: t("ts.khishtSpec"), sub: t("ts.khishtClassic") },
                  { v: "-200", label: "−200", sub: t("ts.khishtFlat") },
                  { v: "-500", label: "−500", sub: t("ts.khishtHarsh") },
                ]
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

        {isBackgammon && (
          <div className="ts-field">
            <span className="ts-label">Match length</span>
            <div className="seg">
              {(
                [
                  { v: "", label: "Single", sub: "One game decides it" },
                  { v: "bo3", label: "Best of 3", sub: "First to 2 games" },
                  { v: "bo5", label: "Best of 5", sub: "First to 3 games" },
                ]
              ).map((o) => (
                <button
                  key={o.v || "single"}
                  className={o.v === bgFormat ? "seg-btn active" : "seg-btn"}
                  onClick={() => setBgFormat(o.v)}
                  title={o.sub}
                >
                  {o.label}
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
            onClick={() => onSubmit(seats, teamsEligible ? mode : "solo", visibility, visibility === "private" ? password.trim() : "", isJokeri ? khisht : "", isBackgammon ? bgFormat : isJokeri ? jokeriFormat : "")}
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
