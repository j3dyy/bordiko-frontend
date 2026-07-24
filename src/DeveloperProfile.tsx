import { useEffect, useState } from "react";
import { fetchDeveloper } from "./api.ts";
import { gameMeta } from "./games.ts";
import type { DeveloperProfile as DevProfile } from "./wire.ts";

// A developer's PUBLIC author page: their name and the games they've published.
// Reached from a developer-game's creator line on the game detail page.
export function DeveloperProfile({
  id,
  onOpenGame,
  onBack,
}: {
  id: string;
  onOpenGame: (gameId: string) => void;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<DevProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchDeveloper(id)
      .then((p) => live && setProfile(p))
      .catch(() => live && setProfile(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [id]);

  const name = profile?.displayName || friendly(id);

  return (
    <div className="profile">
      <button className="ghost" onClick={onBack} style={{ marginBottom: 12 }}>
        ← Back
      </button>

      <section className="profile-head">
        <div className="profile-avatar ph">{initial(name)}</div>
        <div className="profile-id">
          <h1 className="profile-name">{name}</h1>
          <div className="profile-provider">Developer</div>
        </div>
        <div className="profile-totals">
          <div className="stat-tile">
            <div className="stat-num">{profile?.games.length ?? 0}</div>
            <div className="stat-lbl">Published games</div>
          </div>
        </div>
      </section>

      <h3 className="section-title">Published games</h3>
      {loading ? (
        <p className="hint">Loading…</p>
      ) : !profile || profile.games.length === 0 ? (
        <p className="hint">No published games yet.</p>
      ) : (
        <div className="profile-games">
          {profile.games.map((g) => {
            const m = gameMeta(g.id);
            return (
              <button
                className="profile-game"
                key={g.id}
                onClick={() => onOpenGame(g.id)}
                style={{ ["--accent" as string]: m.accent }}
              >
                <span className="pg-emoji">{m.emoji}</span>
                <div className="pg-info">
                  <div className="pg-name">{g.displayName || m.name}</div>
                  <div className="pg-record">
                    {g.minPlayers === g.maxPlayers ? `${g.minPlayers} players` : `${g.minPlayers}–${g.maxPlayers} players`} · {g.board}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function initial(name: string): string {
  return (name.trim()[0] || "?").toUpperCase();
}
function friendly(id: string): string {
  const n = id.includes(":") ? id.split(":").slice(1).join(":") : id;
  return n || id;
}
