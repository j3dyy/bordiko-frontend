import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createLobby, fetchCatalog, fetchLeaderboard, joinLobby, listLobbies } from "./api.ts";
import { gameMeta, playersLabel } from "./games.ts";
import type { CatalogGame, LeaderRow, Lobby } from "./wire.ts";

export function Home({
  onWaiting,
  onGame,
  onOpen,
}: {
  onWaiting: (lobby: Lobby) => void;
  onGame: (matchId: string, gameId: string) => void;
  onOpen: (gameId: string) => void;
}) {
  const [catalog, setCatalog] = useState<CatalogGame[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [err, setErr] = useState("");
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [c, l] = await Promise.all([fetchCatalog(), listLobbies()]);
      setCatalog(c);
      setLobbies(l);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    timer.current = window.setInterval(refresh, 4000);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [refresh]);

  async function create(gameId: string) {
    setBusy(gameId);
    setErr("");
    try {
      const lobby = await createLobby(gameId, gameMeta(gameId).minPlayers);
      onWaiting(lobby);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy("");
    }
  }

  async function join(lobby: Lobby) {
    setBusy(lobby.id);
    setErr("");
    try {
      const joined = await joinLobby(lobby.id);
      if (joined.status === "started" && joined.matchId) onGame(joined.matchId, joined.gameId);
      else onWaiting(joined);
    } catch (e) {
      setErr(String((e as Error).message ?? e));
    } finally {
      setBusy("");
    }
  }

  const categories = useMemo(() => {
    const set = new Set(catalog.map((c) => gameMeta(c.id).category));
    return [...set].sort();
  }, [catalog]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter((c) => {
      const m = gameMeta(c.id);
      if (category && m.category !== category) return false;
      if (!q) return true;
      return [m.name, m.author, m.category, c.id].some((s) => s.toLowerCase().includes(q));
    });
  }, [catalog, search, category]);

  // Featured = most-played, then best-rated, then first.
  const featured = useMemo(() => {
    if (!catalog.length) return null;
    return [...catalog].sort((a, b) => b.plays - a.plays || b.rating - a.rating)[0];
  }, [catalog]);

  if (loaded && catalog.length === 0) {
    return (
      <div className="discover">
        <p className="hint">
          No games in the marketplace yet. Publish one with{" "}
          <code>REGISTRY=… node tools/publish.mjs games/&lt;id&gt;</code>.
        </p>
      </div>
    );
  }

  const showFeatured = featured && !search && !category;

  return (
    <div className="discover">
      <div className="searchbar">
        <span className="search-ic" aria-hidden>⌕</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${catalog.length} game${catalog.length === 1 ? "" : "s"}, creators, tags…`}
          aria-label="search games"
        />
      </div>

      <div className="chips">
        <button className={category === "" ? "chip active" : "chip"} onClick={() => setCategory("")}>
          All games
        </button>
        {categories.map((c) => (
          <button key={c} className={category === c ? "chip active" : "chip"} onClick={() => setCategory(category === c ? "" : c)}>
            {c}
          </button>
        ))}
      </div>

      {showFeatured && <Featured game={featured} busy={busy === featured.id} onPlay={() => create(featured.id)} />}

      <div className="discover-cols">
        <div className="discover-main">
          <h2 className="section-title">{category || "All games"}</h2>
          {filtered.length === 0 ? (
            <p className="hint">No games match “{search}”.</p>
          ) : (
            <div className="catalog">
              {filtered.map((c) => (
                <GameCard key={c.id} game={c} busy={busy === c.id} onCreate={() => create(c.id)} onOpen={() => onOpen(c.id)} />
              ))}
            </div>
          )}
        </div>

        <aside className="discover-rail">
          {featured && <TopPlayers gameId={featured.id} />}
          <LiveNow lobbies={lobbies} busy={busy} onJoin={join} />
        </aside>
      </div>

      {err && <p className="error">{err}</p>}
    </div>
  );
}

/* -------------------------------- pieces ---------------------------------- */

function Stars({ rating, count }: { rating: number; count: number }) {
  if (count === 0) return <span className="gc-unrated">New</span>;
  return (
    <span className="gc-rating" title={`${rating.toFixed(2)} from ${count} rating${count === 1 ? "" : "s"}`}>
      <span className="star">★</span> {rating.toFixed(1)} <span className="gc-count">({count.toLocaleString()})</span>
    </span>
  );
}

function GameCard({ game, busy, onCreate, onOpen }: { game: CatalogGame; busy: boolean; onCreate: () => void; onOpen: () => void }) {
  const m = gameMeta(game.id);
  return (
    <article className="game-card" style={{ ["--accent" as string]: m.accent }}>
      <div className="gc-open" onClick={onOpen} role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onOpen()}>
        <div className="gc-top">
          <div className="game-emoji">{m.emoji}</div>
          <span className="cat-pill">{m.category}</span>
        </div>
        <div className="gc-body">
          <h3 className="gc-title">
            {m.name}
            {m.verified && <span className="verified" title="Verified creator">✓</span>}
          </h3>
          <div className="gc-creator">{m.author}</div>
          <p className="gc-blurb">{m.blurb}</p>
        </div>
        <div className="gc-stats">
          <Stars rating={game.rating} count={game.ratingCount} />
          <span className="gc-plays">{game.plays.toLocaleString()} plays</span>
          {game.live > 0 && <span className="gc-live">● {game.live} live</span>}
        </div>
      </div>
      <button disabled={busy} onClick={onCreate}>
        {busy ? "Creating…" : "New table"}
      </button>
    </article>
  );
}

function Featured({ game, busy, onPlay }: { game: CatalogGame; busy: boolean; onPlay: () => void }) {
  const m = gameMeta(game.id);
  return (
    <section className="featured" style={{ ["--accent" as string]: m.accent }}>
      <div className="featured-info">
        <span className="featured-eyebrow">Featured</span>
        <h2 className="featured-title">{m.name}</h2>
        <p className="featured-blurb">{m.blurb}</p>
        <div className="featured-cta">
          <button disabled={busy} onClick={onPlay}>
            {busy ? "Creating…" : "▶ Play now"}
          </button>
          <span className="featured-meta">
            {m.author} · {playersLabel(m)} players · {game.plays.toLocaleString()} plays
            {game.ratingCount > 0 && <> · ★ {game.rating.toFixed(1)}</>}
          </span>
        </div>
      </div>
      <div className="featured-art" aria-hidden>{m.emoji}</div>
    </section>
  );
}

function TopPlayers({ gameId }: { gameId: string }) {
  const [rows, setRows] = useState<LeaderRow[]>([]);
  useEffect(() => {
    let live = true;
    fetchLeaderboard(gameId)
      .then((r) => live && setRows(r.slice(0, 5)))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [gameId]);

  return (
    <div className="rail-card">
      <div className="rail-head">
        <h4>Top players</h4>
        <span className="rail-tag">{gameMeta(gameId).name}</span>
      </div>
      {rows.length === 0 ? (
        <p className="hint">No ranked games yet.</p>
      ) : (
        <ol className="rail-ranks">
          {rows.map((r, i) => (
            <li key={r.userId}>
              <span className={`rank-badge r${i + 1}`}>{i + 1}</span>
              {r.avatarUrl ? (
                <img className="rail-avatar" src={r.avatarUrl} alt="" />
              ) : (
                <span className="rail-avatar ph">{initial(r.displayName)}</span>
              )}
              <span className="rail-name">{r.displayName}</span>
              <span className="rail-rating">{r.rating}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function LiveNow({ lobbies, busy, onJoin }: { lobbies: Lobby[]; busy: string; onJoin: (l: Lobby) => void }) {
  return (
    <div className="rail-card">
      <div className="rail-head">
        <span className="live-dot" />
        <h4>Live now</h4>
      </div>
      {lobbies.length === 0 ? (
        <p className="hint">No open tables. Start one to play.</p>
      ) : (
        <div className="live-list">
          {lobbies.map((l) => {
            const m = gameMeta(l.gameId);
            return (
              <div className="live-row" key={l.id}>
                <span className="live-emoji">{m.emoji}</span>
                <div className="live-meta">
                  <div className="live-game">{m.name}</div>
                  <div className="live-seats">
                    {l.players.length}/{l.seats} seats · {l.players[0]?.name ?? "?"}
                  </div>
                </div>
                <button className="small" disabled={busy === l.id} onClick={() => onJoin(l)}>
                  {busy === l.id ? "…" : "Join"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function initial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}
